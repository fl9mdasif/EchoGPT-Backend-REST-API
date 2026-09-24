import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('AiProviders (e2e)', () => {
  let app: INestApplication<App>;
  const email = `test-${randomUUID()}@echogpt.dev`;
  const password = 'StrongPassw0rd!';
  let accessToken: string;
  let providerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password });
    accessToken = registerResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/ai-providers',
    );
    expect(response.status).toBe(401);
  });

  it('starts with the seeded global OpenAI provider visible', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ai-providers')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(
      response.body.data.some(
        (p: { ownerUserId: string | null }) => p.ownerUserId === null,
      ),
    ).toBe(true);
  });

  it('creates a provider and never echoes the raw API key back', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-providers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'My Anthropic key',
        type: 'ANTHROPIC',
        apiKey: 'sk-ant-1234567890abcdef',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.type).toBe('ANTHROPIC');
    expect(response.body.data.apiKeyPreview).toBe('sk-a••••cdef');
    expect(JSON.stringify(response.body)).not.toContain(
      'sk-ant-1234567890abcdef',
    );
    providerId = response.body.data.id;
  });

  it('updates the provider name and disables it', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/ai-providers/${providerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed', isEnabled: false });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Renamed');
    expect(response.body.data.isEnabled).toBe(false);
  });

  it('runs a health check against the provider (mocked, no real key needed)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/ai-providers/${providerId}/health`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ok).toBe(true);
    expect(typeof response.body.data.latencyMs).toBe('number');
  });

  it("rejects editing another user's/nonexistent provider with 404", async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/ai-providers/does-not-exist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'nope' });

    expect(response.status).toBe(404);
  });

  it('deletes the provider', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/ai-providers/${providerId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
  });
});

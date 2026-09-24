import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  const email = `test-${randomUUID()}@echogpt.dev`;
  const password = 'StrongPassw0rd!';
  let accessToken: string;
  let conversationId: string;

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
      '/api/v1/chat/conversations',
    );
    expect(response.status).toBe(401);
  });

  it('starts with an empty conversation list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });

  it('sends a prompt with no conversationId, creating one implicitly, dispatched to the seeded global provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Hello, EchoGPT!' });

    expect(response.status).toBe(201);
    expect(response.body.data.userMessage.content).toBe('Hello, EchoGPT!');
    expect(response.body.data.assistantMessage.role).toBe('ASSISTANT');
    expect(response.body.data.assistantMessage.content).toContain(
      'Hello, EchoGPT!',
    );
    conversationId = response.body.data.conversationId;
  });

  it('lists the conversation just created', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].id).toBe(conversationId);
  });

  it('returns paginated message history for the conversation (user + assistant messages)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });

  it('continues the same conversation on a second send, and usage increments', async () => {
    const beforeUsage = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/usage')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(beforeUsage.body.data.requestsUsed).toBe(1);

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ conversationId, content: 'Follow-up question' });

    expect(response.status).toBe(201);
    expect(response.body.data.conversationId).toBe(conversationId);

    const afterUsage = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/usage')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(afterUsage.body.data.requestsUsed).toBe(2);
  });

  it('bonus: streams a chat response via SSE', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/chat/send/stream')
      .query({ content: 'Stream this please' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: conversation');
    expect(response.text).toContain('event: chunk');
    expect(response.text).toContain('event: done');
  }, 15_000);

  it("404s sending to someone else's/a nonexistent conversation id", async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ conversationId: 'does-not-exist', content: 'hi' });

    expect(response.status).toBe(404);
  });

  it('blocks further sends once the FREE plan limit (50 requests) is reached', async () => {
    const limitEmail = `limit-${randomUUID()}@echogpt.dev`;
    const limitRegister = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: limitEmail, password });
    const limitToken = limitRegister.body.data.accessToken as string;

    for (let i = 0; i < 50; i++) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${limitToken}`)
        .send({ content: `message ${i}` });
      expect(response.status).toBe(201);
    }

    const blockedResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/send')
      .set('Authorization', `Bearer ${limitToken}`)
      .send({ content: 'one too many' });
    expect(blockedResponse.status).toBe(403);
  }, 60_000);

  it('deletes the conversation', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/chat/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
  });
});

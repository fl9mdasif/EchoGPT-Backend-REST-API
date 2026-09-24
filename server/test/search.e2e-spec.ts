import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  const email = `test-${randomUUID()}@echogpt.dev`;
  const password = 'StrongPassw0rd!';
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
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
    const response = await request(app.getHttpServer()).post('/api/v1/search').send({ query: 'x' });
    expect(response.status).toBe(401);
  });

  it('runs a search and returns mock results, uncached', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: 'best budget laptops 2026' });

    expect(response.status).toBe(200);
    expect(response.body.data.cached).toBe(false);
    expect(response.body.data.results).toHaveLength(3);
    expect(response.body.data.results[0]).toHaveProperty('title');
    expect(response.body.data.results[0]).toHaveProperty('url');
  });

  it('serves the identical repeat query from cache and does not count against usage', async () => {
    const beforeUsage = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/usage')
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await request(app.getHttpServer())
      .post('/api/v1/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: 'best budget laptops 2026' });

    expect(response.status).toBe(200);
    expect(response.body.data.cached).toBe(true);

    const afterUsage = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/usage')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(afterUsage.body.data.requestsUsed).toBe(beforeUsage.body.data.requestsUsed);
  });

  it('lists search history with the two distinct queries', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: 'best budget laptops for students' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/search/history')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(2);
  });

  it('returns recent searches, most recent first', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].query).toBe('best budget laptops for students');
  });

  it('suggests past queries matching a prefix', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/search/suggestions')
      .query({ q: 'best budget' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.suggestions).toContain('best budget laptops 2026');
    expect(response.body.data.suggestions).toContain('best budget laptops for students');
  });

  it('returns no suggestions for an empty prefix', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/search/suggestions')
      .query({ q: '' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.suggestions).toEqual([]);
  });
});

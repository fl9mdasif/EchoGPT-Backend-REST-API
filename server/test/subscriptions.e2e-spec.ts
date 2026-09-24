import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Subscriptions (e2e)', () => {
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
    const response = await request(app.getHttpServer()).get('/api/v1/subscriptions/me');
    expect(response.status).toBe(401);
  });

  it('defaults a new user to a FREE, active subscription', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.plan).toBe('FREE');
    expect(response.body.data.status).toBe('ACTIVE');
    expect(response.body.data.requestsLimit).toBe(50);
  });

  it('reports usage/remaining consistent with the FREE limit', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/usage')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.requestsUsed).toBe(0);
    expect(response.body.data.remaining).toBe(50);
  });

  it('upgrades to PREMIUM and raises the limit', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/upgrade')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.plan).toBe('PREMIUM');
    expect(response.body.data.requestsLimit).toBe(5000);
    expect(response.body.data.renewsAt).not.toBeNull();
  });

  it('downgrades back to FREE', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/downgrade')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.plan).toBe('FREE');
    expect(response.body.data.requestsLimit).toBe(50);
  });
});

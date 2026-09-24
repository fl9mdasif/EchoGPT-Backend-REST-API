import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const email = `test-${randomUUID()}@echogpt.dev`;
  const password = 'StrongPassw0rd!';

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user with a token pair', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(email);
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(typeof response.body.data.refreshToken).toBe('string');
  });

  it('rejects a duplicate registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password });

    expect(response.status).toBe(409);
  });

  it('logs in with the registered credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
  });

  it('rejects login with a wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1!' });

    expect(response.status).toBe(401);
  });

  it('rotates tokens on refresh, then rejects the reused refresh token, then logs out', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    const firstRefreshToken = loginResponse.body.data.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken });

    expect(refreshResponse.status).toBe(200);
    const secondRefreshToken = refreshResponse.body.data.refreshToken as string;
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // Rotation means the original refresh token is now revoked.
    const reuseResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken });
    expect(reuseResponse.status).toBe(401);

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: secondRefreshToken });
    expect(logoutResponse.status).toBe(204);

    // The now-revoked token can no longer be refreshed.
    const afterLogoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondRefreshToken });
    expect(afterLogoutResponse.status).toBe(401);
  });

  it('rejects a garbage refresh token with 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });

    expect(response.status).toBe(401);
  });
});

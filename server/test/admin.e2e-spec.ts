import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  const userEmail = `test-${randomUUID()}@echogpt.dev`;
  const userPassword = 'StrongPassw0rd!';
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let globalProviderId: string;

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
      .send({ email: userEmail, password: userPassword });
    userToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;

    // Seeded by prisma/seed.ts (see docs/tasks.md Phase 2).
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@echogpt.dev', password: 'ChangeMe123!' });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a non-admin user with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(403);
  });

  it('returns dashboard stats for an admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(typeof response.body.data.totalUsers).toBe('number');
    expect(response.body.data.totalUsers).toBeGreaterThan(0);
  });

  it('reports system health with a connected database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/system-health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.databaseConnected).toBe(true);
  });

  it('lists users, findable by search', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .query({ search: userEmail })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(userId);
    expect(response.body.data[0].isActive).toBe(true);
  });

  it('disables a user, blocking their login, then reactivates them', async () => {
    const disableResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(disableResponse.status).toBe(200);
    expect(disableResponse.body.data.isActive).toBe(false);

    const blockedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: userPassword });
    expect(blockedLogin.status).toBe(401);

    const reactivateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });
    expect(reactivateResponse.status).toBe(200);
    expect(reactivateResponse.body.data.isActive).toBe(true);

    const allowedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: userPassword });
    expect(allowedLogin.status).toBe(200);
  });

  it('lists subscriptions and lets an admin override one', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meta.total).toBeGreaterThan(0);

    const overrideResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/subscriptions/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ requestsLimit: 999 });
    expect(overrideResponse.status).toBe(200);
    expect(overrideResponse.body.data.requestsLimit).toBe(999);
  });

  it('manages a global AI provider end to end', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/ai-providers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Gemini',
        type: 'GEMINI',
        apiKey: 'admin-key-1234567890',
      });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.ownerUserId).toBeNull();
    globalProviderId = createResponse.body.data.id;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/ai-providers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.data.some(
        (p: { id: string }) => p.id === globalProviderId,
      ),
    ).toBe(true);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/ai-providers/${globalProviderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isEnabled: false });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.isEnabled).toBe(false);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/admin/ai-providers/${globalProviderId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResponse.status).toBe(204);
  });

  it('reports usage analytics with at least one recorded request', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/usage-analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalRequests).toBeGreaterThan(0);
  });

  it('returns paginated raw request logs', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('endpoint');
    expect(response.body.data[0]).toHaveProperty('statusCode');
  });
});

import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Users (e2e)', () => {
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

  it('rejects an unauthenticated profile request with 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/me');
    expect(response.status).toBe(401);
  });

  it('returns the current profile with a valid access token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(email);
    expect(response.body.data.name).toBeNull();
  });

  it('updates the profile name', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test User' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test User');
  });

  it('rejects a password change with the wrong current password', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPassword1!', newPassword: 'AnotherStrongPass1!' });

    expect(response.status).toBe(401);
  });

  it('changes the password, then rejects login with the old one and accepts the new one', async () => {
    const newPassword = 'AnotherStrongPass1!';
    const changeResponse = await request(app.getHttpServer())
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword });
    expect(changeResponse.status).toBe(204);

    const oldLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });

  it('deletes the account, after which login fails', async () => {
    const deleteResponse = await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteResponse.status).toBe(204);

    const loginAfterDelete = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'AnotherStrongPass1!' });
    expect(loginAfterDelete.status).toBe(401);
  });
});

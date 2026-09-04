import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HealthController } from '../src/modules/health/health.controller';
import { configureApplication } from '../src/bootstrap';
import { ConnectionStates } from 'mongoose';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [HealthController],
    providers: [
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      {
        provide: getConnectionToken(),
        useValue: { readyState: ConnectionStates.connected },
      },
    ],
  })
  class TestHealthModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestHealthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health wraps the unchanged health data', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 200,
          success: true,
          timestamp: expect.any(String),
          path: '/api/v1/health',
          data: { status: 'ok', database: 'up' },
          error: null,
        });
        expect(new Date(response.body.timestamp).toISOString()).toBe(
          response.body.timestamp,
        );
      }));
});

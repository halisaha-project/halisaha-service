import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { HealthController } from '../src/modules/health/health.controller';
import { configureApplication } from '../src/bootstrap';
import { ConnectionStates } from 'mongoose';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [HealthController],
    providers: [
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

  it('GET /api/v1/health returns ok', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' }));
});

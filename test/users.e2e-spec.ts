import { Module } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

describe('Users endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [UsersController],
    providers: [
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
      {
        provide: UsersService,
        useValue: {
          findRequiredById: jest.fn().mockResolvedValue({
            toJSON: () => ({
              id: '1',
              name: 'A',
              surname: 'B',
              username: 'user',
              email: 'mail@example.com',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          }),
        },
      },
    ],
  })
  class TestUsersModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestUsersModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns a safe public user response', () =>
    request(app.getHttpServer())
      .get('/api/v1/users/6658a63e957fdc8261e8912a')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveProperty('id', '1');
        expect(response.body.data).not.toHaveProperty('passwordHash');
        expect(response.body.data).not.toHaveProperty('_id');
      }));

  it('rejects invalid IDs', () =>
    request(app.getHttpServer())
      .get('/api/v1/users/not-an-id')
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 400,
          success: false,
          timestamp: expect.any(String),
          path: '/api/v1/users/not-an-id',
          data: null,
          error: {
            message: 'Invalid MongoDB identifier',
            type: 'BAD_REQUEST',
            clientMessage: 'Geçersiz İstek.',
          },
        });
      }));
});

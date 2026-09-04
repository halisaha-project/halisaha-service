import { Module } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PositionsController } from '../src/modules/positions/positions.controller';
import { PositionsService } from '../src/modules/positions/positions.service';

describe('Positions endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [PositionsController],
    providers: [
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
      {
        provide: PositionsService,
        useValue: {
          findAll: jest.fn().mockResolvedValue([
            {
              id: '1',
              name: 'Goalkeeper',
              abbreviation: 'GK',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
          findById: jest.fn().mockResolvedValue({
            id: '1',
            name: 'Goalkeeper',
            abbreviation: 'GK',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      },
    ],
  })
  class TestPositionsModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestPositionsModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('lists positions', () =>
    request(app.getHttpServer())
      .get('/api/v1/positions')
      .expect(200)
      .expect((response) => {
        expect(response.body.data[0]).toMatchObject({
          name: 'Goalkeeper',
          abbreviation: 'GK',
        });
      }));

  it('rejects invalid MongoDB IDs without leaking cast details', () =>
    request(app.getHttpServer())
      .get('/api/v1/positions/not-an-id')
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 400,
          success: false,
          timestamp: expect.any(String),
          path: '/api/v1/positions/not-an-id',
          data: null,
          error: {
            message: 'Invalid MongoDB identifier',
            type: 'BAD_REQUEST',
            clientMessage: 'Geçersiz İstek.',
          },
        });
      }));
});

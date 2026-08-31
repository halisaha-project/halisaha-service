import { Module } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { PositionsController } from '../src/modules/positions/positions.controller';
import { PositionsService } from '../src/modules/positions/positions.service';

describe('Positions endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [PositionsController],
    providers: [
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
        expect(response.body[0]).toMatchObject({
          name: 'Goalkeeper',
          abbreviation: 'GK',
        });
      }));

  it('rejects invalid MongoDB IDs without leaking cast details', () =>
    request(app.getHttpServer())
      .get('/api/v1/positions/not-an-id')
      .expect(400)
      .expect({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid MongoDB identifier',
      }));
});

import { Module } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

describe('Users endpoint (e2e)', () => {
  let app: INestApplication;

  @Module({
    controllers: [UsersController],
    providers: [
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
        expect(response.body).toHaveProperty('id', '1');
        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('_id');
      }));

  it('rejects invalid IDs', () =>
    request(app.getHttpServer())
      .get('/api/v1/users/not-an-id')
      .expect(400)
      .expect({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid MongoDB identifier',
      }));
});

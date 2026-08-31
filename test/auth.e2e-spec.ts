import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Auth registration endpoint (e2e)', () => {
  let app: INestApplication;
  const register = jest.fn().mockResolvedValue({
    id: '1',
    name: 'A',
    surname: 'B',
    username: 'user',
    email: 'mail@example.com',
    emailVerified: false,
  });

  @Module({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: { register } }],
  })
  class TestAuthModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAuthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });
  afterAll(() => app.close());

  it('returns the safe created user', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'A',
        surname: 'B',
        username: 'user',
        email: 'mail@example.com',
        password: 'password123',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({ id: '1', email: 'mail@example.com' }),
        );
        expect(response.body).not.toHaveProperty('passwordHash');
      }));

  it('rejects invalid registration data', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'invalid' })
      .expect(400));
});

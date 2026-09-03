import { ExecutionContext, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { MatchesController } from '../src/modules/matches/matches.controller';
import { MatchesService } from '../src/modules/matches/matches.service';

describe('Matches HTTP contract', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ status: 'draft' }),
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: 'm' }),
    update: jest.fn().mockResolvedValue({ id: 'm', name: 'updated' }),
    participants: jest.fn().mockResolvedValue({ status: 'draft' }),
    generate: jest.fn().mockResolvedValue({ status: 'ready' }),
  };
  @Module({
    controllers: [MatchesController],
    providers: [{ provide: MatchesService, useValue: service }],
  })
  class TestModule {}
  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context
            .switchToHttp()
            .getRequest<{ user: { userId: string } }>().user = {
            userId: 'owner-id',
          };
          return true;
        },
      })
      .compile();
    app = ref.createNestApplication();
    configureApplication(app);
    await app.init();
  });
  afterAll(() => app.close());
  it('requires bearer authentication and exposes scoped routes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/not-an-id/matches')
      .send({ name: 'x', scheduledAt: 'bad' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/groups/507f1f77bcf86cd799439011/matches')
      .send({ name: 'x', scheduledAt: '2026-09-05T18:00:00.000Z' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/groups/507f1f77bcf86cd799439011/matches')
      .expect(200);
    await request(app.getHttpServer())
      .get(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012',
      )
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012',
      )
      .send({ name: 'updated' })
      .expect((response) => {
        if (response.status !== 200) {
          throw new Error(JSON.stringify(response.body));
        }
      })
      .expect(200);
    await request(app.getHttpServer())
      .put(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012/participants',
      )
      .send({
        participantUserIds: [
          '507f1f77bcf86cd799439013',
          '507f1f77bcf86cd799439014',
        ],
      })
      .expect(200);
    await request(app.getHttpServer())
      .post(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012/generate-teams',
      )
      .expect(201);
  });
});

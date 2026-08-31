import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { VotingController } from '../src/modules/voting/voting.controller';
import { VotingService } from '../src/modules/voting/voting.service';
describe('Voting HTTP contract', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ score: 4 }),
    list: jest.fn().mockResolvedValue([]),
    results: jest.fn().mockResolvedValue({ results: [] }),
  };
  @Module({
    controllers: [VotingController],
    providers: [{ provide: VotingService, useValue: service }],
  })
  class TestModule {}
  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = ref.createNestApplication();
    configureApplication(app);
    await app.init();
  });
  afterAll(() => app.close());
  it('validates ids and vote score', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/not-an-id/matches/not-an-id/votes')
      .send({ targetUserId: 'bad', score: 9 })
      .expect(400);
    await request(app.getHttpServer())
      .post(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012/votes',
      )
      .send({ targetUserId: '507f1f77bcf86cd799439013', score: 4 })
      .expect(201);
    await request(app.getHttpServer())
      .get(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012/votes',
      )
      .expect(200);
    await request(app.getHttpServer())
      .get(
        '/api/v1/groups/507f1f77bcf86cd799439011/matches/507f1f77bcf86cd799439012/votes/results',
      )
      .expect(200);
  });
});

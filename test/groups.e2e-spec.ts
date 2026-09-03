import { ExecutionContext, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { GroupsController } from '../src/modules/groups/groups.controller';
import { GroupsService } from '../src/modules/groups/groups.service';

describe('Groups MongoIdPipe routing (e2e)', () => {
  let app: INestApplication;
  const groupId = '6a99bbafe2b756c11cd34814';
  const service = {
    get: jest.fn().mockResolvedValue({ id: groupId }),
    update: jest.fn().mockResolvedValue({ id: groupId, name: 'Updated' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    invite: jest.fn().mockResolvedValue({ invited: true }),
  };

  @Module({
    controllers: [GroupsController],
    providers: [{ provide: GroupsService, useValue: service }],
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

  it('validates only groupId and leaves CurrentUser and bodies untouched', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}`)
      .expect(200);
    expect(service.get).toHaveBeenCalledWith(groupId, 'owner-id');

    await request(app.getHttpServer())
      .patch(`/api/v1/groups/${groupId}`)
      .send({ name: 'Updated' })
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(
      groupId,
      { name: 'Updated' },
      'owner-id',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/invitations`)
      .send({ email: 'user@example.com' })
      .expect(201);
    expect(service.invite).toHaveBeenCalledWith(
      groupId,
      { email: 'user@example.com' },
      'owner-id',
    );
  });

  it('still rejects an invalid groupId', () =>
    request(app.getHttpServer())
      .get('/api/v1/groups/not-an-id')
      .expect(400)
      .expect({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid MongoDB identifier',
      }));
});

import { ExecutionContext, INestApplication, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApplication } from '../src/bootstrap';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { GroupsController } from '../src/modules/groups/groups.controller';
import { GroupsService } from '../src/modules/groups/groups.service';

describe('Groups MongoIdPipe routing (e2e)', () => {
  let app: INestApplication;
  const groupId = '6a99bbafe2b756c11cd34814';
  const service = {
    create: jest.fn().mockResolvedValue({ id: groupId, name: 'Cuma Tayfa' }),
    get: jest.fn().mockResolvedValue({ id: groupId }),
    update: jest.fn().mockResolvedValue({ id: groupId, name: 'Updated' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    invite: jest.fn().mockResolvedValue({ invited: true }),
  };

  @Module({
    controllers: [GroupsController],
    providers: [
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
      { provide: GroupsService, useValue: service },
    ],
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
      .post('/api/v1/groups')
      .send({
        groupName: 'Cuma Tayfa',
        mainPosition: 'DEF',
        altPosition: 'MID',
        shirtNumber: 11,
      })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      {
        groupName: 'Cuma Tayfa',
        mainPosition: 'DEF',
        altPosition: 'MID',
        shirtNumber: 11,
      },
      'owner-id',
    );

    await request(app.getHttpServer())
      .post('/api/v1/groups')
      .send({ name: 'Cuma Tayfa' })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toMatchObject({
          type: 'BAD_REQUEST',
          clientMessage: 'name Alanı Bu İstek İçin Desteklenmiyor.',
        });
      });

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
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 400,
          success: false,
          timestamp: expect.any(String),
          path: '/api/v1/groups/not-an-id',
          data: null,
          error: {
            message: 'Invalid MongoDB identifier',
            type: 'BAD_REQUEST',
            clientMessage: 'Geçersiz İstek.',
          },
        });
      }));
});

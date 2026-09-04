import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../src/infrastructure/mail/mail.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { GroupsService } from '../src/modules/groups/groups.service';
import { UsersService } from '../src/modules/users/users.service';

describe('transactional mail call sites', () => {
  it('passes only the recipient and raw token for email verification', async () => {
    const verificationModel = { create: jest.fn().mockResolvedValue({}) };
    const mail = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      {
        create: jest.fn().mockResolvedValue({
          _id: 'user-id',
          email: 'user@example.com',
          toJSON: () => ({ id: 'user-id', email: 'user@example.com' }),
        }),
      } as unknown as UsersService,
      {} as JwtService,
      {} as ConfigService,
      undefined,
      verificationModel as never,
      mail as unknown as MailService,
    );

    await service.register({
      name: 'Name',
      surname: 'Surname',
      username: 'username',
      email: 'user@example.com',
      password: 'password',
    });

    expect(mail.sendEmailVerification).toHaveBeenCalledWith({
      recipientEmail: 'user@example.com',
      token: expect.any(String),
    });
    expect(verificationModel.create.mock.calls[0][0]).not.toHaveProperty(
      'token',
    );
  });

  it('keeps password-reset requests anti-enumerating while mailing known users', async () => {
    const resetModel = {
      updateMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
      create: jest.fn().mockResolvedValue({}),
    };
    const mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      {
        findByEmail: jest.fn().mockResolvedValue({
          _id: 'user-id',
          email: 'user@example.com',
        }),
      } as unknown as UsersService,
      {} as JwtService,
      {} as ConfigService,
      undefined,
      undefined,
      mail as unknown as MailService,
      resetModel as never,
    );

    await expect(
      service.requestPasswordReset({ email: 'user@example.com' }),
    ).resolves.toEqual({ accepted: true });
    expect(mail.sendPasswordReset).toHaveBeenCalledWith({
      recipientEmail: 'user@example.com',
      token: expect.any(String),
    });
    expect(resetModel.create.mock.calls[0][0]).not.toHaveProperty('token');
  });

  it('passes recipient, group name, and raw token for invitations', async () => {
    const group = {
      _id: 'group-id',
      name: 'Sunday Team',
      ownerId: 'owner-id',
      memberIds: ['owner-id'],
    };
    const invitations = {
      updateMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
      create: jest.fn().mockResolvedValue({}),
    };
    const mail = {
      sendGroupInvitation: jest.fn().mockResolvedValue(undefined),
    };
    const service = new GroupsService(
      {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(group),
        }),
      } as never,
      invitations as never,
      {
        findByEmail: jest.fn().mockResolvedValue({
          _id: 'invited-id',
          email: 'invited@example.com',
        }),
      } as unknown as UsersService,
      mail as unknown as MailService,
    );

    await expect(
      service.invite('group-id', { email: 'invited@example.com' }, 'owner-id'),
    ).resolves.toEqual({ invited: true });
    expect(mail.sendGroupInvitation).toHaveBeenCalledWith({
      recipientEmail: 'invited@example.com',
      groupName: 'Sunday Team',
      token: expect.any(String),
      code: expect.stringMatching(/^\d{6}$/),
    });
    expect(invitations.create.mock.calls[0][0]).not.toHaveProperty('token');
    const rawToken = mail.sendGroupInvitation.mock.calls[0][0].token;
    const rawCode = mail.sendGroupInvitation.mock.calls[0][0].code;
    expect(invitations.create.mock.calls[0][0].tokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(invitations.create.mock.calls[0][0].codeHash).toBe(
      createHash('sha256').update(rawCode).digest('hex'),
    );
    expect(invitations.create.mock.calls[0][0]).not.toHaveProperty('code');
  });

  it.each([
    ['development', true],
    ['production', false],
    ['test', false],
  ] as const)(
    'exposes invitation tokens in %s only when development is expected',
    async (nodeEnv, exposesToken) => {
      const invitations = {
        updateMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
        create: jest.fn().mockResolvedValue({}),
      };
      const mail = {
        sendGroupInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const service = new GroupsService(
        {
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: 'group-id',
              name: 'Sunday Team',
              ownerId: 'owner-id',
              memberIds: ['owner-id'],
            }),
          }),
        } as never,
        invitations as never,
        {
          findByEmail: jest.fn().mockResolvedValue({
            _id: 'invited-id',
            email: 'invited@example.com',
          }),
        } as unknown as UsersService,
        mail as unknown as MailService,
        undefined,
        { get: jest.fn().mockReturnValue(nodeEnv) } as never,
      );

      const response = await service.invite(
        'group-id',
        { email: 'invited@example.com' },
        'owner-id',
      );
      const rawToken = mail.sendGroupInvitation.mock.calls[0][0].token;
      const rawCode = mail.sendGroupInvitation.mock.calls[0][0].code;

      expect(response).toEqual(
        exposesToken
          ? {
              invited: true,
              developmentToken: rawToken,
              developmentCode: rawCode,
            }
          : { invited: true },
      );
      expect(invitations.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          tokenHash: createHash('sha256').update(rawToken).digest('hex'),
          codeHash: createHash('sha256').update(rawCode).digest('hex'),
        }),
      );
      expect(invitations.create.mock.calls[0][0]).not.toHaveProperty('token');
      expect(invitations.create.mock.calls[0][0]).not.toHaveProperty('code');
    },
  );
});

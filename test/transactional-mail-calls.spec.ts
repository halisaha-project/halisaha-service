import { ConfigService } from '@nestjs/config';
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
    });
    expect(invitations.create.mock.calls[0][0]).not.toHaveProperty('token');
  });
});

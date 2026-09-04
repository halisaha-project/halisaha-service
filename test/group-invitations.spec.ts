import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { GroupsService } from '../src/modules/groups/groups.service';
import { AcceptInvitationDto } from '../src/modules/groups/dto/invitation.dto';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function acceptanceService(findOneAndUpdate: jest.Mock) {
  const updateOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  });
  const service = new GroupsService(
    { updateOne } as never,
    { findOneAndUpdate } as never,
    {} as never,
    {} as never,
  );
  return { service, updateOne };
}

describe('Group invitation codes', () => {
  it('accepts an exactly six-digit code including a leading zero', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ groupId: 'group-id' }),
    });
    const { service } = acceptanceService(findOneAndUpdate);

    await expect(
      service.accept({ code: '004821' }, 'intended-user'),
    ).resolves.toEqual({ accepted: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        codeHash: hash('004821'),
        invitedUserId: 'intended-user',
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { $gt: expect.any(Date) },
      },
      { $set: { acceptedAt: expect.any(Date) } },
      { new: true },
    );
  });

  it.each(['incorrect', 'expired', 'revoked'])(
    'rejects an %s invitation code when no active scoped invitation matches',
    async () => {
      const findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const { service } = acceptanceService(findOneAndUpdate);

      await expect(
        service.accept({ code: '483271' }, 'intended-user'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
      });
    },
  );

  it('atomically prevents a consumed code from being reused', async () => {
    const exec = jest
      .fn()
      .mockResolvedValueOnce({ groupId: 'group-id' })
      .mockResolvedValueOnce(null);
    const { service, updateOne } = acceptanceService(
      jest.fn().mockReturnValue({ exec }),
    );

    await expect(
      service.accept({ code: '483271' }, 'intended-user'),
    ).resolves.toEqual({ accepted: true });
    await expect(
      service.accept({ code: '483271' }, 'intended-user'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
    });
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it('binds identical codes to the authenticated intended user', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const { service } = acceptanceService(findOneAndUpdate);

    await expect(
      service.accept({ code: '483271' }, 'other-user'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
    });
    expect(findOneAndUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        codeHash: hash('483271'),
        invitedUserId: 'other-user',
      }),
    );
  });

  it('keeps existing high-entropy token acceptance', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ groupId: 'group-id' }),
    });
    const { service } = acceptanceService(findOneAndUpdate);

    await service.accept({ token: 'raw-invitation-token' }, 'intended-user');

    expect(findOneAndUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tokenHash: hash('raw-invitation-token'),
        invitedUserId: 'intended-user',
      }),
    );
    expect(findOneAndUpdate.mock.calls[0][0]).not.toHaveProperty('codeHash');
  });

  it('requires exactly one token or code', async () => {
    const { service } = acceptanceService(jest.fn());
    await expect(service.accept({}, 'user')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
    });
    await expect(
      service.accept({ token: 'token', code: '483271' }, 'user'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
    });
  });

  it('validates the manual code as exactly six numeric characters', async () => {
    const invitationProfile = {
      mainPosition: 'MID',
      altPosition: 'FWD',
      shirtNumber: 8,
    };
    for (const code of ['12345', '1234567', '12A456']) {
      const dto = Object.assign(new AcceptInvitationDto(), {
        code,
        ...invitationProfile,
      });
      await expect(validate(dto)).resolves.not.toHaveLength(0);
    }
    const valid = Object.assign(new AcceptInvitationDto(), {
      code: '004821',
      ...invitationProfile,
    });
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('reissues with a fresh code and revokes the previous active invitation', async () => {
    const updateMany = jest.fn().mockReturnValue({ exec: jest.fn() });
    const create = jest.fn().mockResolvedValue({});
    const sendGroupInvitation = jest.fn().mockResolvedValue(undefined);
    const service = new GroupsService(
      {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'group-id',
            name: 'Team',
            ownerId: 'owner-id',
            memberIds: ['owner-id'],
          }),
        }),
      } as never,
      { updateMany, create } as never,
      {
        findByEmail: jest.fn().mockResolvedValue({
          _id: 'invited-id',
          email: 'player@example.com',
        }),
      } as never,
      { sendGroupInvitation } as never,
      undefined,
      {
        get: jest.fn().mockReturnValue('development'),
      } as unknown as ConfigService,
    );

    const first = await service.invite(
      'group-id',
      { email: 'player@example.com' },
      'owner-id',
    );
    const second = await service.invite(
      'group-id',
      { email: 'player@example.com' },
      'owner-id',
    );

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(first.developmentCode).toMatch(/^\d{6}$/);
    expect(second.developmentCode).toMatch(/^\d{6}$/);
    expect(second.developmentCode).not.toBe(first.developmentCode);
    expect(create.mock.calls[1][0].codeHash).toBe(
      hash(second.developmentCode!),
    );
  });
});

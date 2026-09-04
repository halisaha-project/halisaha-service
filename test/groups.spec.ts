import { ValidationPipe } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { validate } from 'class-validator';
import { Model } from 'mongoose';
import { validationExceptionFactory } from '../src/bootstrap';
import { CreateGroupDto } from '../src/modules/groups/dto/group.dto';
import { GroupsService } from '../src/modules/groups/groups.service';
import { Group } from '../src/modules/groups/schemas/group.schema';
import { GroupInvitation } from '../src/modules/groups/schemas/group-invitation.schema';
import { GroupMembership } from '../src/modules/groups/schemas/group-membership.schema';

function groupDocument(name: string, ownerId = 'owner-id'): Group {
  return {
    _id: 'group-id',
    name,
    ownerId,
    memberIds: [ownerId],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Group;
}

function serviceFor(
  create: jest.Mock,
  membershipModel?: Model<GroupMembership>,
) {
  return new GroupsService(
    { create } as unknown as Model<Group>,
    {} as Model<GroupInvitation>,
    { findSafeIdentitiesByIds: jest.fn().mockResolvedValue([]) } as never,
    {} as never,
    membershipModel,
  );
}

describe('Groups create contract', () => {
  it('maps groupName to persisted name and adds the owner as a member', async () => {
    const create = jest.fn().mockResolvedValue(groupDocument('Cuma Tayfa'));
    const membershipCreate = jest.fn().mockResolvedValue({});
    const membershipFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    const service = serviceFor(create, {
      create: membershipCreate,
      find: membershipFind,
    } as never);

    const result = await service.create(
      {
        groupName: '  Cuma Tayfa  ',
        mainPosition: 'DEF',
        altPosition: 'MID',
        shirtNumber: 11,
      },
      'owner-id',
    );

    expect(create).toHaveBeenCalledWith({
      name: 'Cuma Tayfa',
      ownerId: 'owner-id',
      memberIds: ['owner-id'],
    });
    expect(membershipCreate).toHaveBeenCalledWith({
      groupId: 'group-id',
      userId: 'owner-id',
      mainPosition: 'DEF',
      altPosition: 'MID',
      shirtNumber: 11,
    });
    expect(result.name).toBe('Cuma Tayfa');
  });

  it('merges safe user identities with membership profiles for group detail', async () => {
    const group = groupDocument('Cuma Tayfa');
    group.memberIds = ['owner-id', 'player-id'] as never;
    const usersLookup = jest.fn().mockResolvedValue([
      { id: 'owner-id', name: 'Murat', surname: 'Yılmaz' },
      { id: 'player-id', name: 'Ayşe', surname: 'Demir' },
    ]);
    const membershipFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              userId: 'owner-id',
              mainPosition: 'FWD',
              altPosition: 'MID',
              shirtNumber: 11,
            },
          ]),
        }),
      }),
    });
    const service = new GroupsService(
      {
        findById: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(group) }),
      } as never,
      {} as never,
      { findSafeIdentitiesByIds: usersLookup } as never,
      {} as never,
      { find: membershipFind } as never,
    );

    const result = await service.get('group-id', 'owner-id');

    expect(usersLookup).toHaveBeenCalledWith(['owner-id', 'player-id']);
    expect(usersLookup).toHaveBeenCalledTimes(1);
    expect(result.members).toEqual([
      {
        userId: 'owner-id',
        name: 'Murat',
        surname: 'Yılmaz',
        mainPosition: 'FWD',
        altPosition: 'MID',
        shirtNumber: 11,
      },
      { userId: 'player-id', name: 'Ayşe', surname: 'Demir' },
    ]);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('email');
  });

  it('allows multiple groups with the same name', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(groupDocument('Cuma Tayfa', 'owner-1'))
      .mockResolvedValueOnce(groupDocument('Cuma Tayfa', 'owner-2'));
    const service = serviceFor(create);

    await expect(
      service.create(
        {
          groupName: 'Cuma Tayfa',
          mainPosition: 'DEF',
          altPosition: 'MID',
          shirtNumber: 11,
        },
        'owner-1',
      ),
    ).resolves.toEqual(expect.objectContaining({ name: 'Cuma Tayfa' }));
    await expect(
      service.create(
        {
          groupName: 'Cuma Tayfa',
          mainPosition: 'MID',
          altPosition: 'FWD',
          shirtNumber: 8,
        },
        'owner-2',
      ),
    ).resolves.toEqual(expect.objectContaining({ name: 'Cuma Tayfa' }));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('uses the Turkish field label for groupName validation', async () => {
    const dto = new CreateGroupDto();
    dto.groupName = '';
    const exception = validationExceptionFactory(await validate(dto));

    expect(exception.clientMessage).toBe('Takım Adı Boş Bırakılamaz.');
    expect(exception.message).toBe('groupName should not be empty');
  });

  it('rejects legacy name through whitelist validation', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    });

    await expect(
      pipe.transform(
        { name: 'Cuma Tayfa' },
        {
          type: 'body',
          metatype: CreateGroupDto,
          data: '',
        },
      ),
    ).rejects.toMatchObject({
      clientMessage: 'name Alanı Bu İstek İçin Desteklenmiyor.',
    });
  });

  it('stores the authenticated invitee profile while claiming the invitation', async () => {
    const invitation = {
      groupId: 'group-id',
    };
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(invitation),
    });
    const updateOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    const findOneAndUpdateMembership = jest.fn().mockResolvedValue({});
    const service = new GroupsService(
      { updateOne } as never,
      { findOneAndUpdate } as never,
      {} as never,
      {} as never,
      { findOneAndUpdate: findOneAndUpdateMembership } as never,
    );

    await expect(
      service.accept(
        {
          token: 'invitation-token',
          mainPosition: 'MID',
          altPosition: 'FWD',
          shirtNumber: 8,
        },
        'authenticated-user',
      ),
    ).resolves.toEqual({ accepted: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        invitedUserId: 'authenticated-user',
        tokenHash: createHash('sha256')
          .update('invitation-token')
          .digest('hex'),
      }),
      { $set: { acceptedAt: expect.any(Date) } },
      { new: true },
    );
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'group-id' },
      { $addToSet: { memberIds: 'authenticated-user' } },
    );
    expect(findOneAndUpdateMembership).toHaveBeenCalledWith(
      { groupId: 'group-id', userId: 'authenticated-user' },
      {
        $setOnInsert: {
          mainPosition: 'MID',
          altPosition: 'FWD',
          shirtNumber: 8,
        },
      },
      { upsert: true, new: true },
    );
  });
});

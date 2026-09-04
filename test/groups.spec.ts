import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { Model } from 'mongoose';
import { validationExceptionFactory } from '../src/bootstrap';
import { CreateGroupDto } from '../src/modules/groups/dto/group.dto';
import { GroupsService } from '../src/modules/groups/groups.service';
import { Group } from '../src/modules/groups/schemas/group.schema';
import { GroupInvitation } from '../src/modules/groups/schemas/group-invitation.schema';

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

function serviceFor(create: jest.Mock) {
  return new GroupsService(
    { create } as unknown as Model<Group>,
    {} as Model<GroupInvitation>,
    {} as never,
    {} as never,
  );
}

describe('Groups create contract', () => {
  it('maps groupName to persisted name and adds the owner as a member', async () => {
    const create = jest.fn().mockResolvedValue(groupDocument('Cuma Tayfa'));
    const service = serviceFor(create);

    const result = await service.create(
      { groupName: '  Cuma Tayfa  ' },
      'owner-id',
    );

    expect(create).toHaveBeenCalledWith({
      name: 'Cuma Tayfa',
      ownerId: 'owner-id',
      memberIds: ['owner-id'],
    });
    expect(result.name).toBe('Cuma Tayfa');
  });

  it('allows multiple groups with the same name', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(groupDocument('Cuma Tayfa', 'owner-1'))
      .mockResolvedValueOnce(groupDocument('Cuma Tayfa', 'owner-2'));
    const service = serviceFor(create);

    await expect(
      service.create({ groupName: 'Cuma Tayfa' }, 'owner-1'),
    ).resolves.toEqual(expect.objectContaining({ name: 'Cuma Tayfa' }));
    await expect(
      service.create({ groupName: 'Cuma Tayfa' }, 'owner-2'),
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
});

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { BCRYPT_ROUNDS } from '../modules/auth/auth.constants';
import { Group } from '../modules/groups/schemas/group.schema';
import { GroupMembership } from '../modules/groups/schemas/group-membership.schema';
import { User } from '../modules/users/schemas/user.schema';
import { POSITION_ABBREVIATIONS } from '../modules/positions/positions.service';

type FootballPosition = (typeof POSITION_ABBREVIATIONS)[number];

export const MOCK_TEAM_NAME = 'VotEleven 20 Kişilik Test Takımı';
export const MOCK_TEAM_PASSWORD = 'Test1234!';

export interface MockPlayerSeed {
  name: string;
  surname: string;
  username: string;
  email: string;
  shirtNumber: number;
  mainPosition: FootballPosition;
  altPosition: FootballPosition;
}

export const MOCK_TEAM_PLAYERS: readonly MockPlayerSeed[] = [
  {
    name: 'Murat',
    surname: 'Yılmaz',
    username: 'mock.murat',
    email: 'murat.mock@halisaha.local',
    shirtNumber: 1,
    mainPosition: 'GK',
    altPosition: 'DEF',
  },
  {
    name: 'Berkan',
    surname: 'Kaya',
    username: 'mock.berkan',
    email: 'berkan.mock@halisaha.local',
    shirtNumber: 12,
    mainPosition: 'GK',
    altPosition: 'DEF',
  },
  {
    name: 'Emir',
    surname: 'Demir',
    username: 'mock.emir',
    email: 'emir.mock@halisaha.local',
    shirtNumber: 23,
    mainPosition: 'DEF',
    altPosition: 'GK',
  },
  {
    name: 'Can',
    surname: 'Arslan',
    username: 'mock.can',
    email: 'can.mock@halisaha.local',
    shirtNumber: 30,
    mainPosition: 'DEF',
    altPosition: 'GK',
  },
  {
    name: 'Oğuz',
    surname: 'Şahin',
    username: 'mock.oguz',
    email: 'oguz.mock@halisaha.local',
    shirtNumber: 2,
    mainPosition: 'DEF',
    altPosition: 'MID',
  },
  {
    name: 'Kerem',
    surname: 'Aydın',
    username: 'mock.kerem',
    email: 'kerem.mock@halisaha.local',
    shirtNumber: 3,
    mainPosition: 'DEF',
    altPosition: 'MID',
  },
  {
    name: 'Mert',
    surname: 'Koç',
    username: 'mock.mert',
    email: 'mert.mock@halisaha.local',
    shirtNumber: 4,
    mainPosition: 'DEF',
    altPosition: 'MID',
  },
  {
    name: 'Burak',
    surname: 'Çelik',
    username: 'mock.burak',
    email: 'burak.mock@halisaha.local',
    shirtNumber: 5,
    mainPosition: 'DEF',
    altPosition: 'FWD',
  },
  {
    name: 'Arda',
    surname: 'Yıldız',
    username: 'mock.arda',
    email: 'arda.mock@halisaha.local',
    shirtNumber: 6,
    mainPosition: 'DEF',
    altPosition: 'MID',
  },
  {
    name: 'Tolga',
    surname: 'Aksoy',
    username: 'mock.tolga',
    email: 'tolga.mock@halisaha.local',
    shirtNumber: 15,
    mainPosition: 'DEF',
    altPosition: 'FWD',
  },
  {
    name: 'Efe',
    surname: 'Kılıç',
    username: 'mock.efe',
    email: 'efe.mock@halisaha.local',
    shirtNumber: 8,
    mainPosition: 'MID',
    altPosition: 'DEF',
  },
  {
    name: 'Kaan',
    surname: 'Özdemir',
    username: 'mock.kaan',
    email: 'kaan.mock@halisaha.local',
    shirtNumber: 10,
    mainPosition: 'MID',
    altPosition: 'FWD',
  },
  {
    name: 'Onur',
    surname: 'Kurt',
    username: 'mock.onur',
    email: 'onur.mock@halisaha.local',
    shirtNumber: 14,
    mainPosition: 'MID',
    altPosition: 'DEF',
  },
  {
    name: 'Yiğit',
    surname: 'Aslan',
    username: 'mock.yigit',
    email: 'yigit.mock@halisaha.local',
    shirtNumber: 16,
    mainPosition: 'MID',
    altPosition: 'FWD',
  },
  {
    name: 'Batuhan',
    surname: 'Polat',
    username: 'mock.batuhan',
    email: 'batuhan.mock@halisaha.local',
    shirtNumber: 18,
    mainPosition: 'MID',
    altPosition: 'DEF',
  },
  {
    name: 'Furkan',
    surname: 'Erdem',
    username: 'mock.furkan',
    email: 'furkan.mock@halisaha.local',
    shirtNumber: 20,
    mainPosition: 'MID',
    altPosition: 'FWD',
  },
  {
    name: 'Samet',
    surname: 'Güneş',
    username: 'mock.samet',
    email: 'samet.mock@halisaha.local',
    shirtNumber: 7,
    mainPosition: 'FWD',
    altPosition: 'MID',
  },
  {
    name: 'Ali',
    surname: 'Tekin',
    username: 'mock.ali',
    email: 'ali.mock@halisaha.local',
    shirtNumber: 9,
    mainPosition: 'FWD',
    altPosition: 'MID',
  },
  {
    name: 'Berk',
    surname: 'Yalçın',
    username: 'mock.berk',
    email: 'berk.mock@halisaha.local',
    shirtNumber: 11,
    mainPosition: 'FWD',
    altPosition: 'MID',
  },
  {
    name: 'Deniz',
    surname: 'Karaca',
    username: 'mock.deniz',
    email: 'deniz.mock@halisaha.local',
    shirtNumber: 17,
    mainPosition: 'FWD',
    altPosition: 'MID',
  },
] as const;

export interface MockTeamSeedModels {
  users: Model<User>;
  groups: Model<Group>;
  memberships: Model<GroupMembership>;
}

export function assertMockTeamSeedAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Mock team seed is disabled in production');
  }
}

export async function seedMockTeam(
  models: MockTeamSeedModels,
): Promise<{ groupId: string }> {
  const passwordHash = await bcrypt.hash(MOCK_TEAM_PASSWORD, BCRYPT_ROUNDS);
  const users = [];

  for (const player of MOCK_TEAM_PLAYERS) {
    const existing = await models.users
      .findOne({
        $or: [{ email: player.email }, { username: player.username }],
      })
      .exec();
    const fields = {
      name: player.name,
      surname: player.surname,
      username: player.username,
      email: player.email,
      passwordHash,
      emailVerified: true,
    };
    const user = existing
      ? await models.users
          .findByIdAndUpdate(
            (existing as User & { _id: unknown })._id,
            { $set: fields },
            { new: true },
          )
          .exec()
      : await models.users.create(fields);
    if (!user) throw new Error('Failed to seed mock user');
    users.push(user as User & { _id: unknown });
  }

  const memberIds = users.map((user) => user._id);
  const group = await models.groups
    .findOneAndUpdate(
      { name: MOCK_TEAM_NAME },
      { $set: { ownerId: memberIds[0], memberIds } },
      { upsert: true, new: true },
    )
    .exec();
  if (!group) throw new Error('Failed to seed mock group');
  const groupId = (group as Group & { _id: unknown })._id;

  await models.memberships.bulkWrite(
    MOCK_TEAM_PLAYERS.map((player, index) => ({
      updateOne: {
        filter: { groupId, userId: memberIds[index] },
        update: {
          $set: {
            mainPosition: player.mainPosition,
            altPosition: player.altPosition,
            shirtNumber: player.shirtNumber,
          },
        },
        upsert: true,
      },
    })),
  );

  return { groupId: String(groupId) };
}

async function main(): Promise<void> {
  assertMockTeamSeedAllowed(process.env.NODE_ENV);
  const context = await NestFactory.createApplicationContext(AppModule);
  try {
    const config = context.get(ConfigService);
    assertMockTeamSeedAllowed(config.get<string>('nodeEnv'));
    const result = await seedMockTeam({
      users: context.get(getModelToken(User.name)),
      groups: context.get(getModelToken(Group.name)),
      memberships: context.get(getModelToken(GroupMembership.name)),
    });
    console.log(`Mock team seed completed.

Group:
${MOCK_TEAM_NAME}

Group ID:
${result.groupId}

Owner login:
murat.mock@halisaha.local
${MOCK_TEAM_PASSWORD}

Owner username:
mock.murat

Players:
20

Positions:
GK: 2
DEF: 8
MID: 6
FWD: 4`);
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  void main().catch(() => {
    console.error('Mock team seed failed.');
    process.exitCode = 1;
  });
}

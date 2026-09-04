import { GroupMembershipSchema } from '../src/modules/groups/schemas/group-membership.schema';

describe('GroupMembership schema', () => {
  it('uniquely identifies a user within a group without making shirt numbers global', () => {
    expect(GroupMembershipSchema.indexes()).toContainEqual([
      { groupId: 1, userId: 1 },
      { unique: true, background: true },
    ]);
    expect(GroupMembershipSchema.path('shirtNumber').options).toEqual(
      expect.objectContaining({ min: 1, max: 99 }),
    );
  });
});

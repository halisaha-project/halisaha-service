import { GroupInvitationSchema } from '../src/modules/groups/schemas/group-invitation.schema';
import { GroupSchema } from '../src/modules/groups/schemas/group.schema';

describe('Groups ObjectId schema paths', () => {
  it('defines a collision-safe hashed invitation-code index', () => {
    expect(GroupInvitationSchema.path('codeHash').options.required).toBe(true);
    expect(GroupInvitationSchema.indexes()).toContainEqual([
      { invitedUserId: 1, codeHash: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });

  it.each(['groupId', 'invitedUserId', 'invitedByUserId'])(
    'registers GroupInvitation.%s as an ObjectId path',
    (path) => {
      expect(GroupInvitationSchema.path(path).instance).toBe('ObjectId');
    },
  );

  it('registers Group owner and member IDs as ObjectId paths', () => {
    expect(GroupSchema.path('ownerId').instance).toBe('ObjectId');
    expect(GroupSchema.path('memberIds').instance).toBe('Array');
    expect(
      GroupSchema.path('memberIds').getEmbeddedSchemaType()?.instance,
    ).toBe('ObjectId');
  });
});

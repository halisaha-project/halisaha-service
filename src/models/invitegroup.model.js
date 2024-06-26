const mongoose = require('mongoose')
const Schema = mongoose.Schema

const GroupInvitationSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expireAt: {
      type: Date,
      default: Date.now,
      index: { expires: '1h' },
    },
    usesLeft: {
      type: Number,
      default: -1, // -1 means unlimited uses
    },
  },
  { collection: 'groupInvitations' }
)

const GroupInvitation = mongoose.model('GroupInvitation', GroupInvitationSchema)

module.exports = GroupInvitation

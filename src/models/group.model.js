const mongoose = require('mongoose')
const Schema = mongoose.Schema

const GroupSchema = new Schema(
  {
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    members: [
      {
        _id: false,
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        shirtNumber: {
          type: Number,
        },
        mainPosition: {
          type: Schema.Types.ObjectId,
          ref: 'Position',
          required: true,
        },
        altPosition: {
          type: Schema.Types.ObjectId,
          ref: 'Position',
          required: true,
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { collection: 'groups', timestamps: true }
)

const Group = mongoose.model('Group', GroupSchema)

module.exports = Group

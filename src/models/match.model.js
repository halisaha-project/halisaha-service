const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MatchSchema = new Schema(
  {
    matchDate: {
      type: Date,
      required: true,
    },
    createdGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    lineup: {
      homeTeam: [
        {
          user: {
            user: {
              type: Schema.Types.ObjectId,
              ref: 'User',
            },
            shirtNumber: {
              type: Schema.Types.Number,
            },
            mainPosition: {
              type: Schema.Types.ObjectId,
              ref: 'Position',
            },
            altPosition: {
              type: Schema.Types.ObjectId,
              ref: 'Position',
            },
          },
          position: {
            type: Schema.Types.ObjectId,
            ref: 'Position',
          },
          hasVoted: {
            type: Boolean,
            default: false,
          },
        },
      ],
      awayTeam: [
        {
          user: {
            user: {
              type: Schema.Types.ObjectId,
              ref: 'User',
            },
            shirtNumber: {
              type: Schema.Types.Number,
            },
            mainPosition: {
              type: Schema.Types.ObjectId,
              ref: 'Position',
            },
            altPosition: {
              type: Schema.Types.ObjectId,
              ref: 'Position',
            },
          },
          position: {
            type: Schema.Types.ObjectId,
            ref: 'Position',
          },
          hasVoted: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    location: {
      type: String,
      required: true,
    },
  },
  { collection: 'matches', timestamps: true }
)

const Match = mongoose.model('Match', MatchSchema)

module.exports = Match

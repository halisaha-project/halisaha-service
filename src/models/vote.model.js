const mongoose = require('mongoose')
const Schema = mongoose.Schema

const VotingSchema = new Schema(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    votes: [
      {
        voterId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        votedUserId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 10,
          validate: {
            validator: function (value) {
              return (
                Number.isInteger(value) ||
                (value % 1 === 0.5 && value >= 1 && value <= 10)
              )
            },
            message: (props) => `${props.value} is not a valid rating value.`,
          },
        },
      },
    ],
  },
  { collection: 'votings', timestamps: true }
)

const Voting = mongoose.model('Voting', VotingSchema)

module.exports = Voting

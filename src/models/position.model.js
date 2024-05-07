const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PositionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    abbreviation: {
      type: String,
      trim: true,
    },
  },
  { collection: 'positions', timestamps: true }
)

const Position = mongoose.model('Position', PositionSchema)

const predefinedPositions = [
  { name: 'Forward', abbreviation: 'FWD' },
  { name: 'Middlefielder', abbreviation: 'MID' },
  { name: 'Defender', abbreviation: 'DEF' },
  { name: 'Goalkeeper', abbreviation: 'GK' },
]

Position.init()
  .then(async () => {
    for (const pos of predefinedPositions) {
      await Position.findOneAndUpdate({ name: pos.name }, pos, {
        upsert: true,
      })
    }
  })
  .catch((err) => {
    console.error('Error initializing positions:', err)
  })

module.exports = Position

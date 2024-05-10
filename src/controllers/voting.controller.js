const Match = require('../models/match.model')
const Voting = require('../models/vote.model')

const vote = async (req, res) => {
  try {
    const { matchId, voterId, votedUserId, rating } = req.body

    if (!matchId || !voterId || !votedUserId || !rating) {
      return res.status(400).json({ message: 'Missing parameters' })
    }

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).json({ message: 'Could not find the match' })
    }

    const voterIndex = match.lineup.findIndex(
      (player) => player.user.toString() === voterId
    )
    if (voterIndex === -1) {
      return res
        .status(403)
        .json({ message: 'You do not have the permission for voting' })
    }

    const voting = new Voting({
      matchId,
      votes: [{ voterId, votedUserId, rating }],
    })
    await voting.save()

    match.lineup[voterIndex].hasVoted = true
    await match.save()

    res.status(200).json({ message: 'Voting saved successfully' })
  } catch (error) {
    console.error('An error occured while trying to vote: ', error)
    res.status(500).json({
      message: 'An error occured while trying to vote, try again later.',
    })
  }
}

module.exports = vote

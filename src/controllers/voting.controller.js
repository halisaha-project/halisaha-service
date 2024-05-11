const Match = require('../models/match.model')
const Voting = require('../models/vote.model')
const Response = require('../utils/response.util')

const vote = async (req, res) => {
  try {
    const { matchId, voterId, votedUserId, rating } = req.body

    if (!matchId || !voterId || !votedUserId || !rating) {
      return new Response(null, 400, 'Missing parameters').success(res)
    }

    const match = await Match.findById(matchId)
    if (!match) {
      return new Response(null, 404, 'Could not find the match').success(res)
    }

    if (voterId === votedUserId) {
      return new Response(null, 400, 'You cannot vote for yourself').success(
        res
      )
    }

    let isVoterInLineup = false
    let updatedLineup = []

    if (
      match.lineup.homeTeam.some((player) => player.user.toString() === voterId)
    ) {
      updatedLineup = match.lineup.homeTeam.map((player) => {
        if (player.user.toString() === voterId) {
          isVoterInLineup = true
          return { ...player, hasVoted: true }
        }
        return player
      })
    } else if (
      match.lineup.awayTeam.some((player) => player.user.toString() === voterId)
    ) {
      updatedLineup = match.lineup.awayTeam.map((player) => {
        if (player.user.toString() === voterId) {
          isVoterInLineup = true
          return { ...player, hasVoted: true }
        }
        return player
      })
    }

    if (!isVoterInLineup) {
      return new Response(
        null,
        403,
        'You do not have permission for voting'
      ).success(res)
    }

    // Save the vote
    const voting = new Voting({
      matchId,
      votes: [{ voterId, votedUserId, rating }],
    })
    await voting.save()

    // Update the match lineup with the 'hasVoted' property updated
    if (
      match.lineup.homeTeam.some((player) => player.user.toString() === voterId)
    ) {
      match.lineup.homeTeam = updatedLineup
    } else if (
      match.lineup.awayTeam.some((player) => player.user.toString() === voterId)
    ) {
      match.lineup.awayTeam = updatedLineup
    }

    // Save the updated match
    await match.save()

    return new Response(null, 200, 'Voting saved successfully').success(res)
  } catch (error) {
    console.error('An error occurred while trying to vote: ', error)
    return new Response(
      null,
      500,
      'An error occurred while trying to vote, try again later.'
    ).success(res)
  }
}

module.exports = vote

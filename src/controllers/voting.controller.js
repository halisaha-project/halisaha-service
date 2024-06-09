const Match = require('../models/match.model')
const Voting = require('../models/vote.model')
const Response = require('../utils/response.util')
const APIError = require('../utils/error.util')

const vote = async (req, res) => {
  try {
    const { matchId, votes } = req.body
    if (!matchId || !votes || !Array.isArray(votes) || votes.length === 0) {
      throw new APIError('Missing parameters or invalid votes format', 400)
    }

    const voteDetails = votes[0]
    const { voterId, votedUsers } = voteDetails

    if (
      !voterId ||
      !votedUsers ||
      !Array.isArray(votedUsers) ||
      votedUsers.length === 0
    ) {
      throw new APIError('Missing parameters or invalid votedUsers format', 400)
    }

    const match = await Match.findById(matchId).populate('createdGroupId')
    if (!match) {
      throw new APIError('Could not find the match', 404)
    }

    if (votedUsers.some(({ votedUserId }) => voterId === votedUserId)) {
      throw new APIError('You cannot vote for yourself', 400)
    }

    // Save the vote
    const existingVoting = await Voting.findOne({ matchId })
    if (existingVoting) {
      existingVoting.votes.push(voteDetails)
      await existingVoting.save()
    } else {
      const newVoting = new Voting({
        matchId,
        votes: [voteDetails],
      })
      await newVoting.save()
    }

    // Update the match lineup with the 'hasVoted' property updated
    for (let team of ['homeTeam', 'awayTeam']) {
      for (let player of match.lineup[team]) {
        if (player.user.user.toString() === voterId) {
          player.hasVoted = true
        }
      }
    }

    await match.save()

    return new Response(null, 200, 'Voting saved successfully').success(res)
  } catch (error) {
    return new Response(
      null,
      error.statusCode || 500,
      error.message ||
        'An error occurred while trying to vote, try again later.'
    ).success(res)
  }
}

const getVotesByMatchId = async (req, res) => {
  const { id } = req.params
  try {
    const votes = await Voting.findOne({ matchId: id })
    return new Response(votes, 200, 'Votes fetched successfully').success(res)
  } catch (error) {
    return new APIError(
      null,
      500,
      'An error occurred while fetching voting'
    ).success(res)
  }
}

const getVotesByMatchIdInternal = async (matchId) => {
  try {
    const votes = await Voting.findOne({ matchId })
    return votes
  } catch (error) {
    throw new Error('An error occurred while fetching voting')
  }
}

const calculateAverageRatingsByMatchId = async (matchId) => {
  try {
    const allVotes = await getVotesByMatchIdInternal(matchId)

    if (!allVotes || !allVotes.votes) {
      return {}
    }

    const userAverageRatings = {}

    allVotes.votes.forEach((vote) => {
      vote.votedUsers.forEach((votedUser) => {
        const userId = votedUser.votedUserId.toString()
        if (!userAverageRatings[userId]) {
          userAverageRatings[userId] = { totalRating: 0, voteCount: 0 }
        }
        userAverageRatings[userId].totalRating += votedUser.rating
        userAverageRatings[userId].voteCount += 1
      })
    })

    Object.keys(userAverageRatings).forEach((userId) => {
      const userStats = userAverageRatings[userId]
      userAverageRatings[userId] = (
        userStats.totalRating / userStats.voteCount
      ).toFixed(1)
    })
    return userAverageRatings
  } catch (error) {
    throw new Error('An error occurred while calculating average ratings')
  }
}

module.exports = {
  vote,
  getVotesByMatchId,
  calculateAverageRatingsByMatchId,
}

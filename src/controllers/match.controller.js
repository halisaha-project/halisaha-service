const Match = require('../models/match.model')
const Group = require('../models/group.model')
const Response = require('../utils/response.util')

getMatchesByGroupId = async (req, res) => {
  const groupId = req.params.groupId
  const userId = req.user._id

  const isMember = Group.find({
    _id: groupId,
    members: { $elemMatch: { user: userId } },
  })

  if (!isMember) return new APIError('Unauthorized.', 401)

  const matches = await Match.find({
    createdGroupId: groupId,
  }).exec()

  return new Response(matches, 200).success(res)
}

getMatchesByUserId = async (req, res) => {
  const userId = req.user._id

  const matches = await Match.find({
    lineup: { $elemMatch: { user: userId } },
  }).exec()

  return new Response(matches, 200).success(res)
}

getMatchDetails = async (req, res) => {
  const matchId = req.params.matchId
  const userId = req.user._id

  const matchDetails = Match.findOne({ _id: matchId })
    .populate({
      path: 'createdGroupId',
      populate: {
        path: 'members',
        populate: {
          path: '_id',
          model: 'User',
          select: 'shirtNumber',
        },
      },
    })
    .populate({
      path: 'lineup.user',
      select: 'nameSurname username',
    })
    .populate({
      path: 'lineup.position',
      select: 'name abbreviation',
    })
    .exec()

  const groupId = matchDetails.createdGroupId

  const isMember = Group.find({
    _id: groupId,
    members: { $elemMatch: { user: userId } },
  })

  if (!isMember) return new APIError('Unauthorized.', 401)

  return new Response(matchDetails, 200).success(res)
}

module.exports = {
  getMatchesByGroupId,
  getMatchesByUserId,
  getMatchDetails,
}

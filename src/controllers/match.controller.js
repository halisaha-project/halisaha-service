const Match = require('../models/match.model')
const Response = require('../utils/response.util')

getMatchesByGroupId = async (req, res) => {
  const groupId = req.params.groupId
  const userId = req.user._id

  const matches = await Match.find({
    createdGroupId: groupId,
    lineup: { $elemMatch: { user: userId } },
  })
    // .populate({
    //   path: 'createdGroupId',
    //   populate: {
    //     path: 'members',
    //     populate: {
    //       path: '_id',
    //       model: 'User',
    //       select: 'shirtNumber',
    //     },
    //   },
    // })
    // .populate({
    //   path: 'lineup.user',
    //   select: 'nameSurname username',
    // })
    // .populate({
    //   path: 'lineup.position',
    //   select: 'name abbreviation',
    // })
    .exec()

  return new Response(matches, 200).success(res)
}

getMatchesByUserId = async (req, res) => {
  res.json(req)
}

getMatchDetails = async (req, res) => {
  const groupId = req.params.groupId
  const userId = req.user._id

  const matches = await Match.find({
    createdGroupId: groupId,
    lineup: { $elemMatch: { user: userId } },
  })
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

  return new Response(matches, 200).success(res)
}

module.exports = {
  getMatchesByGroupId,
  getMatchesByUserId,
}

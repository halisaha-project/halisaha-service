const Match = require('../models/match.model')
const Group = require('../models/group.model')
const Position = require('../models/position.model')
const Response = require('../utils/response.util')
const APIError = require('../utils/error.util')

const createMatch = async (req, res) => {
  const { groupId, players, formation, matchDate, location } = req.body
  const userId = req.user._id

  const membersDetails = await Group.findOne({
    _id: groupId,
    members: { $elemMatch: { user: userId } },
  })
    .populate([
      { path: 'members.mainPosition', select: 'abbreviation' },
      { path: 'members.altPosition', select: 'abbreviation' },
    ])
    .select('members -_id')

  if (membersDetails.length === 0) throw new APIError('Unauthorized.', 401)

  const playersDetails = membersDetails.members.filter((member) => {
    return players.includes(member.user.toString())
  })

  const positions = await Position.find()
  const getPositionByAbbreviation = (abbreviation) => {
    return positions.find((position) => position.abbreviation === abbreviation)
  }

  // Tek takım
  if (playersDetails.length < 12) {
    const lineup = createLineup(playersDetails, formation)

    const homeTeam = lineup.map((item) => {
      return {
        user: item.player.user,
        positionId: getPositionByAbbreviation(item.position)['_id'],
      }
    })

    var newMatch = new Match({
      matchDate,
      createdGroupId: groupId,
      lineup: {
        homeTeam,
      },
      location,
    })
  }

  const savedMatch = await newMatch.save()

  return new Response(savedMatch).success(res)
}

const createLineup = (players, formation) => {
  const lineup = {
    goalkeeper: null,
    defenders: [],
    midfielders: [],
    forwards: [],
  }
  const inTeam = []

  // Dizilişten pozisyondaki oyuncu sayılarını çekme
  const [defendersCount, midfieldersCount, forwardsCount] = formation
    .split('-')
    .map(Number)
  let sumOfPositions = defendersCount + midfieldersCount + forwardsCount

  // Kaleci olacak mı? Eğer diziliş tam takımdaki oyuncu sayısı kadar seçildiyse kaleci yok.
  const goalkeeperNeeded = players.length - 1 === sumOfPositions

  // Pozisyonlara atama
  const assignPosition = (player, position) => {
    switch (position) {
      case 'DEF':
        if (lineup.defenders.length < defendersCount) {
          lineup.defenders.push(player)
          inTeam.push({ player, position: 'DEF' })
          return true
        }
        break
      case 'MID':
        if (lineup.midfielders.length < midfieldersCount) {
          lineup.midfielders.push(player)
          inTeam.push({ player, position: 'MID' })
          return true
        }
        break
      case 'FWD':
        if (lineup.forwards.length < forwardsCount) {
          lineup.forwards.push(player)
          inTeam.push({ player, position: 'FWD' })
          return true
        }
        break
      case 'GK':
        if (goalkeeperNeeded && !lineup.goalkeeper) {
          lineup.goalkeeper = player
          inTeam.push({ player, position: 'GK' })
          return true
        }
        break
      default:
        return false
    }
    return false
  }

  // Ana pozisyonlarına göre oyuncuları yerleştir.
  players.forEach((player) => {
    assignPosition(player, player.mainPosition.abbreviation)
  })

  // Kalan oyuncuları alternatif pozisyonlarına göre oyuncuları yerleştir.
  const remainingPlayersAlternate = players.filter((player) => {
    return !inTeam.includes(player)
  })
  remainingPlayersAlternate.forEach((player) => {
    assignPosition(player, player.mainPosition.abbreviation)
  })

  // Yerleşemeyen oyuncuları kalan boşluklara yerleştir.
  const remainingPlayersLast = players.filter((player) => {
    return !inTeam.includes(player)
  })
  remainingPlayersLast.forEach((player) => {
    if (goalkeeperNeeded && lineup.goalkeeper === null) {
      lineup.goalkeeper = player
      inTeam.push({ player, position: 'GK' })
    } else if (lineup.defenders.length < defendersCount) {
      lineup.defenders.push(player)
      inTeam.push({ player, position: 'DEF' })
    } else if (lineup.midfielders.length < midfieldersCount) {
      lineup.midfielders.push(player)
      inTeam.push({ player, position: 'MID' })
    } else if (lineup.forwards.length < forwardsCount) {
      lineup.forwards.push(player)
      inTeam.push({ player, position: 'FWD' })
    }
  })

  return inTeam
}

const getMatchesByGroupId = async (req, res) => {
  const groupId = req.params.groupId
  const userId = req.user._id

  const isMember = await Group.find({
    _id: groupId,
    members: { $elemMatch: { user: userId } },
  }).exec()

  if (isMember.length === 0) throw new APIError('Unauthorized.', 401)

  const matches = await Match.find({
    createdGroupId: groupId,
  }).exec()

  return new Response(matches, 200).success(res)
}

const getMatchesByUserId = async (req, res) => {
  const userId = req.user._id

  try {
    const matches = await Match.find({
      'lineup.homeTeam.user': userId,
    }).exec()

    return new Response(matches, 200).success(res)
  } catch (error) {
    return new APIError('Error fetching matches', 500).send(res)
  }
}

const getMatchDetails = async (req, res) => {
  const matchId = req.params.matchId
  const userId = req.user._id

  const matchDetails = await Match.findOne({ _id: matchId })
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
      path: 'lineup.homeTeam.user',
      select: 'nameSurname username',
    })
    .populate({
      path: 'lineup.awayTeam.user',
      select: 'nameSurname username',
    })
    .populate({
      path: 'lineup.homeTeam.position',
      select: 'name abbreviation',
    })
    .populate({
      path: 'lineup.awayTeam.position',
      select: 'name abbreviation',
    })
    .exec()

  const groupId = matchDetails.createdGroupId

  const isMember = await Group.find({
    _id: groupId,
    members: { $elemMatch: { user: userId } },
  }).exec()

  if (isMember.length === 0) throw new APIError('Unauthorized.', 401)

  return new Response(matchDetails, 200).success(res)
}

module.exports = {
  createMatch,
  getMatchesByGroupId,
  getMatchesByUserId,
  getMatchDetails,
}

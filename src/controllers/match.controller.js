const Match = require('../models/match.model')

getMatchesByGroupId = async (req, res) => {
  return res.json(req)
}

getMatchesByUserId = async (req, res) => {
  res.json(req)
}

module.exports = {
  getMatchesByGroupId,
  getMatchesByUserId,
}

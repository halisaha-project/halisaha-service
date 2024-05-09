const express = require('express')
const router = express.Router()
const { checkToken } = require('../middlewares/auth.middleware')
const {
  getMatchesByGroupId,
  getMatchesByUserId,
  getMatchDetails,
} = require('../controllers/match.controller')

router.get('/byGroup/:groupId', checkToken, getMatchesByGroupId)

router.get('/byUser', checkToken, getMatchesByUserId)

router.get('/:matchId', checkToken, getMatchDetails)

module.exports = router

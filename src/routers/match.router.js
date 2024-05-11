const express = require('express')
const router = express.Router()
const { checkToken } = require('../middlewares/auth.middleware')
const {
  createMatch,
  getMatchesByGroupId,
  getMatchesByUserId,
  getMatchDetails,
} = require('../controllers/match.controller')

// CREATE MATCH
router.post('/', checkToken, createMatch)

// GET ALL MATCHES BY GROUP
router.get('/byGroup/:groupId', checkToken, getMatchesByGroupId)

// GET ALL MATCHES BY USER
router.get('/byUser', checkToken, getMatchesByUserId)

// GET MATCHES DETAILS
router.get('/:matchId', checkToken, getMatchDetails)

module.exports = router

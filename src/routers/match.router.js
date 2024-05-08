const express = require('express')
const router = express.Router()
const { checkToken } = require('../middlewares/auth.middleware')
const {
  getMatchesByGroupId,
  getMatchesByUserId,
} = require('../controllers/match.controller')

router.get('/byGroup/:groupId', checkToken, getMatchesByGroupId)

router.get('/byUser', checkToken, getMatchesByUserId)

module.exports = router

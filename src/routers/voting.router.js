const express = require('express')
const router = express.Router()
const { checkToken } = require('../middlewares/auth.middleware')
const { vote, getVotesByMatchId } = require('../controllers/voting.controller')

router.post('/vote', checkToken, vote)
router.get('/:id', getVotesByMatchId)

module.exports = router

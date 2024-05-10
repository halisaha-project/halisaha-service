const express = require('express')
const router = express.Router()
const { checkToken } = require('../middlewares/auth.middleware')
const vote = require('../controllers/voting.controller')

router.post('/vote', checkToken, vote)

module.exports = router

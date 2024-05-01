const express = require('express')
const router = express.Router()
const { login } = require('../controllers/auth.controller')

//LOGIN
router.post('/login', login)

module.exports = router
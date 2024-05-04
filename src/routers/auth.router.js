const express = require('express')
const router = express.Router()
const { login, register, confirmMail } = require('../controllers/auth.controller')

//LOGIN
router.post('/login', login)

//REGISTER
router.post('/register', register)

//CONFIRM MAIL
router.post('/confirmMail', confirmMail)


module.exports = router
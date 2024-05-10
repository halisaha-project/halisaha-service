const router = require('express').Router()
const userRouter = require('./user.router')
const authRouter = require('./auth.router')
const groupRouter = require('./group.router')
const matchRouter = require('./match.router')
const votingRouter = require('./voting.router')

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/groups', groupRouter)
router.use('/matches', matchRouter)
router.use('/voting', votingRouter)

module.exports = router

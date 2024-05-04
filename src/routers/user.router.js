const express = require('express')
const router = express.Router()
const { getAllUsers, getUserById, createNewUser, updateUserById, deleteUser, profile } = require('../controllers/user.controller')
const { checkToken } = require('../middlewares/auth.middleware')


//ME
router.get('/profile', checkToken, profile)

//READ ALL
router.get('/', getAllUsers)

//READ BY ID
router.get('/:id', getUserById)

//CREATE
router.post('/', createNewUser)

//UPDATE
router.patch('/:id', updateUserById)

//DELETE
router.delete('/', checkToken, deleteUser)




module.exports = router
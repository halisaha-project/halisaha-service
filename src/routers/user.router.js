const express = require('express')
const router = express.Router()
const { getAllUsers, getUserById, createNewUser, updateUserById, deleteUserById } = require('../controllers/user.controller')



//READ ALL
router.get('/', getAllUsers)

//READ BY ID
router.get('/:id', getUserById)

//CREATE
router.post('/', createNewUser)

//UPDATE
router.patch('/:id', updateUserById)

//DELETE
router.delete('/:id', deleteUserById)


module.exports = router
const express = require('express')
const router = express.Router()
const {
  getAllGroups,
  leaveGroup,
  getGroupById,
  createNewGroup,
  updateGroupById,
  deleteGroup,
  joinGroup,
  createGroupInvitationLink,
} = require('../controllers/group.controller')
const { checkToken } = require('../middlewares/auth.middleware')

// READ ALL GROUPS
router.get('/', checkToken, getAllGroups)

// READ GROUP BY ID
router.get('/:id', checkToken, getGroupById)

// CREATE NEW GROUP
router.post('/', checkToken, createNewGroup)

// JOIN EXISTING GROUP
router.post('/join', checkToken, joinGroup)

// CREATE GROUP INVITATION LINK
router.post('/invite', checkToken, createGroupInvitationLink)

// UPDATE GROUP BY ID
router.patch('/:id', updateGroupById)

// DELETE GROUP BY ID
router.delete('/:id', checkToken, deleteGroup)

// LEAVE GROUP OR KICK GROUP
router.post('/leave', checkToken, leaveGroup)

module.exports = router

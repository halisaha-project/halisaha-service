const crypto = require('crypto')
const Group = require('../models/group.model')
const GroupInvitation = require('../models/invitegroup.model')
const Position = require('../models/position.model')

const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
    res.status(200).json(groups)
  } catch (error) {
    console.error('Error while getting all groups:', error)
    res.status(500).json({ error: 'An error occurred while fetching groups' })
  }
}

const getGroupById = async (req, res) => {
  const { id } = req.params
  try {
    const group = await Group.findById(id)
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }
    res.status(200).json(group)
  } catch (error) {
    console.error('Error while getting group by id:', error)
    res.status(500).json({ error: 'An error occurred while fetching group' })
  }
}

const updateGroupById = async (req, res) => {
  const { id } = req.params
  const { groupName } = req.body
  try {
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { groupName },
      { new: true }
    )
    if (!updatedGroup) {
      return res.status(404).json({ error: 'Group not found' })
    }
    res.status(200).json(updatedGroup)
  } catch (error) {
    console.error('Error while updating group by id:', error)
    res.status(500).json({ error: 'An error occurred while updating group' })
  }
}

const deleteGroup = async (req, res) => {
  const groupId = req.params.id
  const currentUserId = req.user.id

  try {
    const group = await Group.findById(groupId)

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (group.createdBy.toString() !== currentUserId) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to delete this group' })
    }

    const deletedGroup = await Group.findByIdAndDelete(groupId)

    if (!deletedGroup) {
      return res.status(404).json({ error: 'Group not found' })
    }

    return res.status(200).json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error while deleting group by id:', error)
    return res
      .status(500)
      .json({ error: 'An error occurred while deleting group' })
  }
}

const createNewGroup = async (req, res) => {
  const { groupName, mainPosition, altPosition, shirtNumber } = req.body
  const createdBy = req.user.id

  try {
    const newGroup = new Group({
      groupName: groupName,
      createdBy: createdBy,
      members: [
        {
          user: createdBy,
          mainPosition: mainPosition,
          altPosition: altPosition,
          shirtNumber: shirtNumber,
        },
      ],
    })

    const savedGroup = await newGroup.save()
    res.status(201).json(savedGroup)
  } catch (err) {
    console.error('An error occured while trying to create a new group', err)
    res.status(500).send('An error occured while trying to create a new group.')
  }
}

const createGroupInvitationLink = async (req, res) => {
  const groupId = req.body.groupId
  const userId = req.user.id
  const token = crypto.randomBytes(20).toString('hex')

  try {
    const isMember = await Group.findOne({
      _id: groupId,
      'members.user': userId,
    })
    if (!isMember) {
      return res.status(403).json({
        error:
          'You are not authorized to create an invitation link for this group.',
      })
    }

    const newInvitation = new GroupInvitation({
      groupId: groupId,
      token: token,
      expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    const savedInvitation = await newInvitation.save()
    res.status(201).json(savedInvitation)
  } catch (err) {
    console.error(
      'An error occured while trying to create new invite link.',
      err
    )
    res.status(500).json({
      error: 'An error occured while trying to create new invite link.',
    })
  }
}

const joinGroup = async (req, res) => {
  const userId = req.user.id
  const { invitationToken, mainPosition, altPosition, shirtNumber } = req.body
  const invitation = await GroupInvitation.findOne({ token: invitationToken })

  if (!invitation) {
    return res.status(404).send('Invalid invitation link')
  }

  if (invitation.expireAt < new Date()) {
    return res.status(400).send('Invitation link has expired')
  }

  const group = await Group.findById(invitation.groupId)

  if (!group) {
    return res.status(404).send('Group not found')
  }
  const userInGroup = group.members.some(
    (member) => member.user.toString() === userId
  )

  if (userInGroup) {
    return res.status(400).send('You are already a member of this group')
  }

  group.members.push({
    user: userId,
    mainPosition: mainPosition,
    altPosition: altPosition,
    shirtNumber: shirtNumber,
  })
  await group.save()

  res.status(200).send('Joined the group successfully')
}

const leaveGroup = async (req, res) => {
  const { userId, groupId } = req.body
  const currentUserId = req.user.id

  try {
    const group = await Group.findById(groupId)

    if (!group) {
      return res.status(404).send('Group not found')
    }

    if (
      group.createdBy.toString() === currentUserId ||
      userId === currentUserId
    ) {
      group.members = group.members.filter(
        (member) => member.user.toString() !== userId
      )
      await group.save()

      return res.status(200).send('User left the group successfully')
    } else {
      return res
        .status(403)
        .send('You do not have permission to remove this user from the group')
    }
  } catch (err) {
    console.error('An error occurred while trying to leave the group.', err)
    res.status(500).send('An error occurred while trying to leave the group.')
  }
}

module.exports = {
  getAllGroups,
  getGroupById,
  createNewGroup,
  updateGroupById,
  deleteGroup,
  createNewGroup,
  joinGroup,
  createGroupInvitationLink,
  leaveGroup,
}

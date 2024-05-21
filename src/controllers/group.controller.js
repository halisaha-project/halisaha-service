const crypto = require('crypto')
const Group = require('../models/group.model')
const GroupInvitation = require('../models/invitegroup.model')
const Response = require('../utils/response.util')

const getAllGroups = async (req, res) => {
  const userId = req.user._id.toString()

  try {
    const groups = await Group.find({
      'members.user': userId,
    })
      .populate('members.mainPosition', 'abbreviation name')
      .populate('members.altPosition', 'abbreviation name')

    groups.forEach((group) => {
      group.members = group.members.filter(
        (member) => member.user.toString() === userId
      )
    })

    return new Response(groups, 200).success(res)
  } catch (error) {
    console.error('Error while getting user groups:', error)
    return new Response(
      null,
      500,
      'An error occurred while fetching user groups'
    ).success(res)
  }
}

const getGroupById = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id
  try {
    const group = await Group.findOne({
      _id: id,
      members: { $elemMatch: { user: userId } },
    })
      .populate('members.user', 'nameSurname username email')
      .populate('members.mainPosition', 'abbreviation name')
      .populate('members.altPosition', 'abbreviation name')
      .populate('createdBy', 'nameSurname username email')
    if (!group) {
      return new Response(null, 404, 'Group not found').success(res)
    }
    return new Response(group).success(res)
  } catch (error) {
    console.error('Error while getting group by id:', error)
    return new Response(
      null,
      500,
      'An error occurred while fetching group'
    ).success(res)
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
      return new Response(null, 404, 'Group not found').success(res)
    }
    return new Response(updatedGroup).success(res)
  } catch (error) {
    console.error('Error while updating group by id:', error)
    return new Response(
      null,
      500,
      'An error occurred while updating group'
    ).success(res)
  }
}

const deleteGroup = async (req, res) => {
  const groupId = req.params.id
  const currentUserId = req.user.id

  try {
    const group = await Group.findById(groupId)

    if (!group) {
      return new Response(null, 404, 'Group not found').success(res)
    }

    if (group.createdBy.toString() !== currentUserId) {
      return new Response(
        null,
        403,
        'You do not have permission to delete this group'
      ).success(res)
    }

    const deletedGroup = await Group.findByIdAndDelete(groupId)

    if (!deletedGroup) {
      return new Response(null, 404, 'Group not found').success(res)
    }

    return new Response({ message: 'Group deleted successfully' }).success(res)
  } catch (error) {
    console.error('Error while deleting group by id:', error)
    return new Response(
      null,
      500,
      'An error occurred while deleting group'
    ).success(res)
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

    const populatedGroup = await Group.findById(savedGroup._id).populate({
      path: 'members',
      populate: [
        { path: 'mainPosition', select: 'abbreviation' },
        { path: 'altPosition', select: 'abbreviation' },
      ],
    })

    return new Response(populatedGroup, 201).success(res)
  } catch (err) {
    console.error('An error occurred while trying to create a new group', err)
    return new Response(
      null,
      500,
      'An error occurred while trying to create a new group.'
    ).success(res)
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
      return new Response(
        null,
        403,
        'You are not authorized to create an invitation link for this group.'
      ).success(res)
    }

    const newInvitation = new GroupInvitation({
      groupId: groupId,
      token: token,
      expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    const savedInvitation = await newInvitation.save()
    return new Response(savedInvitation, 201).success(res)
  } catch (err) {
    console.error(
      'An error occurred while trying to create new invite link.',
      err
    )
    return new Response(
      null,
      500,
      'An error occurred while trying to create new invite link.'
    ).success(res)
  }
}

const joinGroup = async (req, res) => {
  const userId = req.user.id
  const { invitationToken, mainPosition, altPosition, shirtNumber } = req.body
  const invitation = await GroupInvitation.findOne({ token: invitationToken })

  if (!invitation) {
    return new Response(null, 404, 'Invalid invitation link').success(res)
  }

  if (invitation.expireAt < new Date()) {
    return new Response(null, 400, 'Invitation link has expired').success(res)
  }

  const group = await Group.findById(invitation.groupId)

  if (!group) {
    return new Response(null, 404, 'Group not found').success(res)
  }
  const userInGroup = group.members.some(
    (member) => member.user.toString() === userId
  )

  if (userInGroup) {
    return new Response(
      null,
      400,
      'You are already a member of this group'
    ).success(res)
  }

  const shirtNumberTaken = group.members.some(
    (member) => member.shirtNumber === shirtNumber
  )

  if (shirtNumberTaken) {
    return new Response(null, 400, 'Shirt number is already taken').success(res)
  }

  group.members.push({
    user: userId,
    mainPosition: mainPosition,
    altPosition: altPosition,
    shirtNumber: shirtNumber,
  })
  const savedGroup = await group.save()

  const populatedGroup = await Group.findById(savedGroup._id).populate({
    path: 'members',
    populate: [
      { path: 'mainPosition', select: 'abbreviation' },
      { path: 'altPosition', select: 'abbreviation' },
    ],
  })

  return new Response(
    populatedGroup,
    201,
    'Joined the group successfully'
  ).success(res)
}

const leaveGroup = async (req, res) => {
  const { userId, groupId } = req.body
  const currentUserId = req.user.id

  try {
    const group = await Group.findById(groupId)

    if (!group) {
      return new Response(null, 404, 'Group not found').success(res)
    }

    if (
      group.createdBy.toString() === currentUserId ||
      userId === currentUserId
    ) {
      group.members = group.members.filter(
        (member) => member.user.toString() !== userId
      )
      await group.save()

      return new Response('User left the group successfully').success(res)
    } else {
      return new Response(
        null,
        403,
        'You do not have permission to remove this user from the group'
      ).success(res)
    }
  } catch (err) {
    console.error('An error occurred while trying to leave the group.', err)
    return new Response(
      null,
      500,
      'An error occurred while trying to leave the group.'
    ).success(res)
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

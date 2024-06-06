const User = require('../models/user.model')
const bcrypt = require('bcrypt')
const APIError = require('../utils/error.util')
const Response = require('../utils/response.util')

const getAllUsers = async (req, res) => {
  const users = await User.find({})
  return res.json({
    success: true,
    data: users,
  })
}

const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (user) {
    return new Response(user).success(res)
  } else {
    throw new APIError('User not found.', 404)
  }
}

const createNewUser = async (req, res) => {
  if (req.body.hasOwnProperty('password')) {
    req.body.password = await bcrypt.hash(req.body.password, 10)
  }

  const _ = User(req.body)
  const newUser = await _.save()
  return new Response(newUser, 201).success(res)
}

const updateUserById = async (req, res) => {
  delete req.body.createdAt
  delete req.body.updatedAt

  if (req.body.hasOwnProperty('password')) {
    req.body.password = await bcrypt.hash(req.body.password, 10)
  }

  const updatedUser = await User.findByIdAndUpdate(
    { _id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  )
  if (updatedUser) {
    return new Response(updatedUser).success(res)
  } else {
    throw new APIError('User not found.', 404)
  }
}

const deleteUser = async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.user._id)
  if (deletedUser) {
    return new Response(deletedUser, 200, 'User deleted successfully.').success(
      res
    )
  } else {
    throw new APIError('User not found.', 404)
  }
}

const profile = async (req, res) => {
  return new Response(req.user).success(res)
}

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const userId = req.user.id

  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new APIError('User not found', 404)
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect current password' })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    return new Response({ message: 'Password updated successfully' }).success(
      res
    )
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message })
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createNewUser,
  updateUserById,
  deleteUser,
  profile,
  changePassword,
}

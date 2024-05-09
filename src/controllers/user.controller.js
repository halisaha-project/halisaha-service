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

module.exports = {
  getAllUsers,
  getUserById,
  createNewUser,
  updateUserById,
  deleteUser,
  profile,
}

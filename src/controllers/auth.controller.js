const User = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const APIError = require('../utils/error.util')
const Response = require('../utils/response.util')
const { createToken } = require('../utils/auth.util')
const { sendVerificationEmail } = require('../utils/email.util')


const login = async (req, res) => {
    const { email, password } = req.body

    const user = await User.find({ email, isVerified: true })
    if (!user) {
        throw new APIError("Invalid email or password.", 401)
    }


    const passCheck = await bcrypt.compare(password, user.password)
    if (!passCheck) {
        throw new APIError("Invalid email or password.", 401)
    }

    const token = await createToken(user, process.env.JWT_EXPIRES_IN)

    return new Response(token).success(res)
}

const register = async (req, res) => {
    const { nameSurname, username, email, password } = req.body

    const existingUserMail = await User.findOne({ email, isVerified: true })
    if (existingUserMail) {
        throw new APIError('This e-mail address is already in use.', 400)
    }

    // Onaylanmamış aynı kullanıcı adlarını sil.
    const thresholdTime = new Date(Date.now() - 300000) // 5 dakika 
    const unverifiedUsers = await User.find({ username, createdAt: { $lt: thresholdTime }, isVerified: false })
    await User.deleteMany({ _id: { $in: unverifiedUsers.map(user => user._id) } })

    const existingUserUsername = await User.findOne({ username })
    if (existingUserUsername) {
        throw new APIError('This username is already in use.', 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const verificationCode = generateVerificationCode()
    const newUser = new User({
        nameSurname,
        username,
        password: hashedPassword,
        email,
        verificationCode
    })
    await newUser.save()

    await sendVerificationEmail(email, verificationCode)

    const token = await createToken(newUser, "5m")

    return res.status(201).json({
        success: true,
        data: token,
        message: 'User created successfully. Please check your e-mail and verify your account.'
    })

}

const generateVerificationCode = () => {
    return Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
}

const confirmMail = async (req, res) => {
    const { token, verificationCode } = req.body
    const jwtData = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findOne({ _id: jwtData.sub }).select("verificationCode createdAt")
    if (!user) throw new APIError('Invalid email or verification code.', 404)
    if (verificationCode != user.verificationCode) throw new APIError('Invalid email or verification code.', 400)

    // confirm mail
    await User.findOneAndUpdate({ _id: jwtData.sub }, { isVerified: true })
    await User.deleteMany({ email: jwtData.email, isVerified: false })

    return new Response().success(res)
}



module.exports = {
    login,
    register,
    confirmMail
}
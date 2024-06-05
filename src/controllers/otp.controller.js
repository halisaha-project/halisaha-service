const crypto = require('crypto')
const bcrypt = require('bcrypt')
const Otp = require('../models/otp.model')
const User = require('../models/user.model')
const APIError = require('../utils/error.util')
const Response = require('../utils/response.util')
const { sendResetPasswordEmail } = require('../utils/email.util')

const sendOtp = async (req, res) => {
  const { email } = req.body

  try {
    const existingUser = await User.findOne({ email })

    if (!existingUser) {
      throw new APIError('E-posta adresi bulunamadı', 400)
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await Otp.create({ email, otp })

    console.log(`OTP for ${email}: ${otp}`)

    await sendResetPasswordEmail(email, otp)

    return new Response({
      success: true,
      message: 'OTP başarıyla oluşturuldu',
    }).success(res)
  } catch (error) {
    console.error('OTP oluşturma hatası:', error)
    if (error instanceof APIError) {
      return error.send(res)
    }
    return new APIError('OTP oluşturulurken bir hata oluştu', 500).send(res)
  }
}

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body

  try {
    const storedOtpData = await Otp.findOne({ email })

    if (!storedOtpData) {
      throw new APIError('Verilen e-posta adresine ait bir OTP bulunamadı', 400)
    }

    if (storedOtpData.otp === otp) {
      return new Response({ success: true, message: 'OTP doğrulandı' }).success(
        res
      )
    } else {
      throw new APIError('Geçersiz OTP', 400)
    }
  } catch (error) {
    console.error('OTP doğrulama hatası:', error)
    if (error instanceof APIError) {
      return error.send(res)
    }
    return new APIError('OTP doğrulanırken bir hata oluştu', 500).send(res)
  }
}

const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body

  try {
    const user = await User.findOne({ email })

    if (!user) {
      throw new APIError('Kullanıcı bulunamadı', 404)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword

    await user.save()

    return new Response({
      success: true,
      message: 'Şifre başarıyla sıfırlandı',
    }).success(res)
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error)
    if (error instanceof APIError) {
      return error.send(res)
    }
    return new APIError('Şifre sıfırlanırken bir hata oluştu', 500).send(res)
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  resetPassword,
}

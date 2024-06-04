const crypto = require('crypto')
const bcrypt = require('bcrypt')
const Otp = require('../models/otp.model')
const User = require('../models/user.model')
const { sendResetPasswordEmail } = require('../utils/email.util')

exports.sendOtp = async (req, res) => {
  const { email } = req.body

  try {
    // E-posta adresine sahip bir kullanıcının veritabanında var olup olmadığını kontrol et
    const existingUser = await User.findOne({ email })

    if (!existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'E-posta adresi bulunamadı' })
    }

    // OTP oluştur
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // MongoDB'ye OTP'yi ve e-posta adresini kaydet
    await Otp.create({ email, otp })

    // Oluşturulan OTP'yi ekrana yazdır (geliştirme amacıyla)
    console.log(`OTP for ${email}: ${otp}`)
    // await sendResetPasswordEmail(email, otp)

    // Yanıt gönder
    return res
      .status(200)
      .json({ success: true, message: 'OTP başarıyla oluşturuldu' })
  } catch (error) {
    console.error('OTP oluşturma hatası:', error)
    return res
      .status(500)
      .json({ success: false, message: 'OTP oluşturulurken bir hata oluştu' })
  }
}

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body

  try {
    // E-posta adresine göre veritabanında OTP'yi bul
    const storedOtpData = await Otp.findOne({ email })

    // Eğer eşleşen bir kayıt bulunamazsa
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: 'Verilen e-posta adresine ait bir OTP bulunamadı',
      })
    }

    // Kayıt bulunduğunda, veritabanındaki OTP ile istekten gelen OTP'yi karşılaştır
    if (storedOtpData.otp === otp) {
      // OTP doğruysa, başarılı yanıt gönder
      return res.status(200).json({ success: true, message: 'OTP doğrulandı' })
    } else {
      // OTP yanlışsa, başarısız yanıt gönder
      return res.status(400).json({ success: false, message: 'Geçersiz OTP' })
    }
  } catch (error) {
    console.error('OTP doğrulama hatası:', error)
    return res
      .status(500)
      .json({ success: false, message: 'OTP doğrulanırken bir hata oluştu' })
  }
}

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body

  try {
    // E-posta adresine sahip kullanıcıyı bul
    const user = await User.findOne({ email })

    // Kullanıcıyı bulamazsa
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Kullanıcı bulunamadı' })
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Kullanıcının şifresini güncelle
    user.password = hashedPassword

    // Kullanıcıyı kaydet
    await user.save()

    // Başarılı yanıt gönder
    return res
      .status(200)
      .json({ success: true, message: 'Şifre başarıyla sıfırlandı' })
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Şifre sıfırlanırken bir hata oluştu' })
  }
}

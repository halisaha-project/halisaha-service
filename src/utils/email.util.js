const nodemailer = require('nodemailer')


const sendVerificationEmail = async (email, verificationCode) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.MAIL,
            pass: process.env.PASS
        }
    })

    const mailOptions = {
        from: process.env.USER,
        to: email,
        subject: 'Hesap Doğrulama',
        html: `
        <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
            <div style="margin:50px auto;width:30%;padding:20px 0">
                <div style="border-bottom:1px solid #eee">
                    <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Halısaha App</a>
                </div>
                <p style="font-size:1.1em">Merhaba,</p>
                <p>Kayıt işlemlerinizi tamamlamak için aşağıdaki OTP'yi kullabilirsiniz. OTP 5 dakika boyunca geçerlidir.</p>
                <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${verificationCode}</h2>
                <p style="font-size:0.9em;">Saygılarımızla,<br />Halısaha App</p>
                <hr style="border:none;border-top:1px solid #eee" />
                <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                    <p>Halısaha App Inc</p>
                    <p>1600 Amphitheatre Parkway</p>
                    <p>California</p>
                </div>
            </div>
        </div>
        `
    }

    await transporter.sendMail(mailOptions)
}

module.exports = {
    sendVerificationEmail
} 
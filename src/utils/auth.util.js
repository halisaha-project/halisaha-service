const jwt = require("jsonwebtoken");

const createToken = async (user, expiresIn) => {
    const payload = {
        sub: user._id,
        nameSurname: user.nameSurname,
        email: user.email,
        username: user.username
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: "HS512",
        expiresIn
    })

    return token;
}

module.exports = {
    createToken
}
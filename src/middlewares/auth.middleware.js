const jwt = require("jsonwebtoken");
const APIError = require("../utils/errors");
const User = require("../models/user.model");


const createToken = async (user, res) => {

    const payload = {
        sub: user._id,
        name: user.name
    }


    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: "HS512",
        expiresIn: process.env.JWT_EXPIRES_IN
    })

    return res.json({
        success: true,
        token
    })
}

const checkToken = async (req, res, next) => {

    let headerToken;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        headerToken = req.headers.authorization.split(" ")[1]
    } else {
        throw new APIError("Unauthorized.", 401)
    }


    jwt.verify(headerToken, process.env.JWT_SECRET, async (err, decoded) => {
        try {
            if (err) next(new APIError("Unauthorized.", 401))

            const user = await User.findById(decoded.sub).select("_id nameSurname email")

            if (!user) next(new APIError("Unauthorized.", 401))

            req.user = user
            next();
        } catch (error) {
            next(new APIError("Unauthorized.", 401))
        }
    })



}


module.exports = {
    createToken,
    checkToken
}
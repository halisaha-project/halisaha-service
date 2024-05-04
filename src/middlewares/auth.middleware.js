const jwt = require("jsonwebtoken");
const APIError = require("../utils/error.util");
const User = require("../models/user.model");


const checkToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return new APIError("Unauthorized.", 401)

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return next(new APIError("Unauthorized.", 401))
        const user = await User.findById(decoded?.sub).select("_id nameSurname email")
        if (!user) return next(new APIError("Unauthorized.", 401))
        req.user = user
        next();

    })
}


module.exports = {
    checkToken
}
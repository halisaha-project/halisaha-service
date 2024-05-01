require('express-async-errors')
const User = require('../models/user.model')
const bcrypt = require('bcrypt')
const APIError = require('../utils/errors')
const Response = require('../utils/response')


const login = async (req, res) => {

    const { email, password } = req.body


    const user = await User.findOne({ email });
    if (!user) {
        throw new APIError("Invalid email or password.", 401)
    }

    const passCheck = await bcrypt.compare(password, user.password)
    if (!passCheck) {
        throw new APIError("Invalid email or password.", 401)
    }

    return new Response(user, 200, "Login successful.").success(res)

}

module.exports = {
    login
}
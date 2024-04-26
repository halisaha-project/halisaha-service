const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')

const UserSchema = new Schema({
    nameSurname: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    }

}, { collection: 'users', timestamps: true });

UserSchema.statics.login = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("InvalidInfo")
    }

    const passCheck = await bcrypt.compare(password, user.password)
    if (!passCheck) {
        throw new Error("InvalidInfo")
    }
    return user
}



const User = mongoose.model('User', UserSchema)

module.exports = User
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
    nameSurname: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },
    verificationCode: {
        type: Number,
        required: true,
        trim: true
    }

}, { collection: 'users', timestamps: true });

const User = mongoose.model('User', UserSchema)

module.exports = User
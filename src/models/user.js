const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            index: { unique: true },
        },
        username: {
            type: String,
            required: true,
            index: { unique: true },
        },
        password: {
            type: String,
            required: true,
        },
        admin: {
            type: Boolean,
            default: false,
            required: true,
        },
        maxSessions: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    },
)

const User = mongoose.model('User', UserSchema)
module.exports = User

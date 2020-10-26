const mongoose = require('mongoose')

// Define session schema in the DB
const sessionSchema = new mongoose.Schema(
    {
        startTime: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        level: {
            type: String,
            required: true,
        },
        courtIndex: {
            type: Number,
            required: true,
        },
        maxSlots: {
            type: Number,
            required: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        // Assigns createdAt and updatedAt fields with a Date type
        timestamps: true,
    },
)

// Define the session model with the schema
const Session = mongoose.model('Session', sessionSchema)

module.exports = Session

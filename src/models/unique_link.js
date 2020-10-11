const mongoose = require('mongoose')

// Define session schema in the DB
const uniqueLinkSchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            required: true,
            index: { unique: true },
        },
        email: {
            type: String,
            required: true,
            index: { unique: true },
        },
        createdBy: {
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
const UniqueLink = mongoose.model('UniqueLink', uniqueLinkSchema)

module.exports = UniqueLink

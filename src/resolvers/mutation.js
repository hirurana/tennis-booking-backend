// For encrypting passwords
const bcrypt = require('bcrypt')
// Dealing with tokens
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const { AuthenticationError, ForbiddenError } = require('apollo-server-express')
const mongoose = require('mongoose')
require('dotenv').config()

module.exports = {
    createSession: async (
        parent,
        { startTime, address, duration, level, courtIndex, maxSlots },
        { models, user },
    ) => {
        // if there is no user in the context throw an authentication error
        if (!(user && user.admin)) {
            throw new ForbiddenError('You must be an admin to make a Session')
        }

        return await models.Session.create({
            startTime,
            address,
            duration,
            level,
            courtIndex,
            maxSlots,
            author: mongoose.Types.ObjectId(user.id),
            lastUpdatedBy: mongoose.Types.ObjectId(user.id),
        })
    },

    updateSession: async (
        parent,
        { id, startTime, address, duration, level, courtIndex, maxSlots },
        { models, user },
    ) => {
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to make a Session',
            )
        }
        //find the session
        const session = await models.Session.findById(id)
        //if user is not an admin, throw ForbiddenError.
        if (!user.admin) {
            throw new ForbiddenError(
                'You do not have permission to update this session',
            )
        }
        // // if new max slots is less than already booked throw an error
        if (session.slotsBooked > maxSlots) {
            throw new ForbiddenError(
                'Cannot change maximum capacity lower than number of users already booked',
            )
        }
        return await models.Session.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: {
                    startTime,
                    address,
                    duration,
                    level,
                    courtIndex,
                    maxSlots,
                    lastUpdatedBy: mongoose.Types.ObjectId(user.id),
                },
            },
            {
                new: true,
            },
        )
    },

    deleteSession: async (parent, { id }, { models, user }) => {
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to delete a session',
            )
        }
        //find the session
        const session = await models.Session.findById(id)

        // if user is not an admin throw a ForbiddenError error
        if (!user.admin) {
            throw new ForbiddenError(
                'You do not have permission to delete this session',
            )
        }

        // TODO do we need to update each booked user's sessions?

        try {
            await session.remove()
            return true
        } catch (err) {
            return false
        }
    },

    createBooking: async (parent, { id }, { models, user }) => {
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to make a booking',
            )
        }
        // find session
        const session = await models.Session.findById(id)

        // if session full throw an error
        if (session.slotsBooked === session.maxSlots) {
            throw new ForbiddenError('This session is fully booked')
        }
        // if already booked return session
        const hasBooked = session.participants.indexOf(user.id)
        if (hasBooked != -1) {
            return session
        } else {
            return await models.Session.findByIdAndUpdate(
                id,
                {
                    $push: {
                        participants: mongoose.Types.ObjectId(user.id),
                    },
                    $inc: {
                        slotsBooked: 1,
                    },
                },
                {
                    new: true,
                },
            )
        }
    },

    deleteBooking: async (parent, { id }, { models, user }) => {
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to make a booking',
            )
        }
        //ForbiddenError for deleting bookings that arent yours??
        // find session
        const session = await models.Session.findById(id)
        // if already booked then remove
        const hasBooked = session.participants.indexOf(user.id)
        if (hasBooked != -1) {
            return await models.Session.findByIdAndUpdate(
                id,
                {
                    $pull: {
                        participants: mongoose.Types.ObjectId(user.id),
                    },
                    $inc: {
                        slotsBooked: -1,
                    },
                },
                {
                    new: true,
                },
            )
        } else {
            // if not booked then return session
            return session
        }
    },

    signUp: async (
        parent,
        { link_uuid, username, email, password },
        { models },
    ) => {
        //check signUp link id
        const linkRecord = await models.UniqueLink.findOne({ uuid: link_uuid })
        if (!linkRecord) {
            throw new ForbiddenError('This link is broken')
        }
        if (!(email === linkRecord.email)) {
            throw new ForbiddenError('Incorrect email provided')
        }

        // normalise email address by trimming whitespaces and convert all to lower case
        email = email.trim().toLowerCase()
        // hash the password
        const hashed = await bcrypt.hash(password, 10)
        // Store user in the DB
        try {
            const user = await models.User.create({
                username,
                email,
                password: hashed,
            })
            await models.UniqueLink.findOneAndRemove({ uuid: link_uuid })
            // create and return JWT
            return jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        } catch (err) {
            console.log(err)
            throw new Error('Error creating account')
        }
    },

    signIn: async (parent, { username, email, password }, { models }) => {
        if (email) {
            //normalise email
            email = email.trim().toLowerCase()
        }

        const user = await models.User.findOne({
            $or: [{ email }, { username }],
        })

        //if no user found
        if (!user) {
            throw new AuthenticationError('Error signing in')
        }

        // if passwords don't match
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new AuthenticationError('Error signing in')
        }
        //create and return the json web token
        return jwt.sign({ id: user._id }, process.env.JWT_SECRET)
    },

    createLink: async (parent, args, { models, user }) => {
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to generate links',
            )
        }

        User = await models.User.findById(user.id)

        if (!User.admin) {
            throw new ForbiddenError('You must be an admin to generate links')
        }

        return await models.UniqueLink.create({
            uuid: uuidv4(),
            email: args.email,
            createdBy: mongoose.Types.ObjectId(user.id),
        })
    },
}

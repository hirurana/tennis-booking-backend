// For encrypting passwords
const bcrypt = require('bcrypt')
// Dealing with tokens
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const sgMail = require('@sendgrid/mail')
const { AuthenticationError, ForbiddenError } = require('apollo-server-express')
const mongoose = require('mongoose')
require('dotenv').config()

const { sessions: getUserSessions } = require('../resolvers/user')
//SendGrid emailer setup API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

module.exports = {
    createSession: async (
        parent,
        { startTime, address, duration, level, courtIndex, maxSlots },
        { models, user: { id: userId } },
    ) => {
        const user = await models.User.findById(userId)
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
        { id, ...args },
        { models, user: { id: userId } },
    ) => {
        const user = await models.User.findById(userId)
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to make a Session',
            )
        }
        //if user is not an admin, throw ForbiddenError.
        if (!user.admin) {
            throw new ForbiddenError(
                'You do not have permission to update this session',
            )
        }
        //find the session
        const session = await models.Session.findById(id)
        if (!session) {
            throw new ForbiddenError(`Session with id ${id} does not exist`)
        }
        if (args.maxSlots) {
            // // if new max slots is less than already booked throw an error
            if (session.slotsBooked > args.maxSlots) {
                throw new ForbiddenError(
                    'Cannot change maximum capacity lower than number of users already booked',
                )
            }
        }
        return await models.Session.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: {
                    ...args,
                    lastUpdatedBy: mongoose.Types.ObjectId(user.id),
                },
            },
            {
                new: true,
            },
        )
    },

    deleteSession: async (parent, { id }, { models, user: { id: userId } }) => {
        const user = await models.User.findById(userId)
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to delete a session',
            )
        }

        // if user is not an admin throw a ForbiddenError error
        if (!user.admin) {
            throw new ForbiddenError(
                'You do not have permission to delete this session',
            )
        }
        //find the session
        const session = await models.Session.findById(id)
        if (!session) {
            throw new ForbiddenError(`Session with id ${id} does not exist`)
        }

        // TODO do we need to update each booked user's sessions?

        try {
            await session.remove()
            return true
        } catch (err) {
            return false
        }
    },

    createBooking: async (parent, { id }, { models, user: { id: userId } }) => {
        const user = await models.User.findById(userId)
        // if there is no user in the context throw an authentication error
        if (!user) {
            throw new AuthenticationError(
                'You must be signed in to make a booking',
            )
        }
        // TODO make 3 a configurable value
        const userSessions = await getUserSessions(user, {}, { models })
        if (userSessions.length === 3) {
            throw new ForbiddenError('You have used all of your bookings')
        }

        // find session
        const session = await models.Session.findById(id)

        // TODO uncomment this some day
        if (
            new Date() >
            new Date(session.startTime).setMinutes(
                new Date(session.startTime).getMinutes() + session.duration,
            )
        ) {
            throw new ForbiddenError('This session has ended!')
        }

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

    deleteBooking: async (parent, { id }, { models, user: { id: userId } }) => {
        const user = await models.User.findById(userId)
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
            await models.UniqueLink.findOneAndDelete({ uuid: link_uuid })
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
        // check if email supplied exists (forgot pass)
        const userExists = await models.User.findOne({ email: args.email })

        if (!user) {
            //if user not logged in then probably a forgot pass request.
            //if user does not exist then bad request
            if (!userExists) {
                throw new AuthenticationError('Email not found')
            }
        } else {
            //user is signed in, check if admin
            user_profile = await models.User.findById(user.id)
            if (!user_profile.admin) {
                throw new ForbiddenError(
                    'You must be an admin to generate links',
                )
            }
        }

        //if link exists remove it to create new one
        const linkExists = await models.UniqueLink.findOneAndDelete({
            email: args.email,
        })
        //if user is admin or if unsigned user requests to create link for an account that exists
        //create a link for them
        //TODO generate email

        const link_ext = uuidv4()

        const msg = {
            to: args.email, // Change to your recipient
            from: 'zcabhra@ucl.ac.uk', // Change to your verified sender
            subject: 'UCL Tennis Society',
            html: `<strong>Please visit the following link to create an account <a href=${
                'http://localhost:1234/reset/' + link_ext
            }> ${'http://localhost:1234/reset/' + link_ext}</strong>`,
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })

        return await models.UniqueLink.create({
            uuid: link_ext,
            email: args.email,
            createdBy: user
                ? mongoose.Types.ObjectId(user.id)
                : mongoose.Types.ObjectId(userExists.id),
        })
    },
}

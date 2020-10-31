// For encrypting passwords
const bcrypt = require('bcrypt')
// Dealing with tokens
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const sgMail = require('@sendgrid/mail')
const {
    AuthenticationError,
    ForbiddenError,
    ValidationError,
} = require('apollo-server-express')
const mongoose = require('mongoose')
require('dotenv').config()

const { sessions: getUserSessions } = require('../resolvers/user')
const { isAdmin, isLoggedIn } = require('./auth')
const { uniqueLinkEmail } = require('./email')
//SendGrid emailer setup API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sessionIsValid = async (session, models) => {
    // check times match up
    const calculatedEndTime = new Date(
        new Date(session.startTime).setMinutes(
            session.startTime.getMinutes() + session.duration,
        ),
    )
    if (calculatedEndTime.getTime() !== session.endTime.getTime()) {
        throw new ValidationError('End times dont match up')
    }

    // check maxSlots
    if (session.maxSlots < session.participants.length) {
        throw new ValidationError('maxSlots must be >= participants.length')
    }

    // check another session doesn't exist on this court at this time
    const overlappingSession = await models.Session.find({
        address: session.address,
        courtIndex: session.courtIndex,
        $or: [
            {
                startTime: {
                    $gt: session.startTime,
                    $lt: session.endTime,
                },
            },
            {
                endTime: {
                    $gt: session.startTime,
                    $lt: session.endTime,
                },
            },
        ],
    })

    if (overlappingSession.length > 0) {
        throw new ValidationError(
            'A session already exists at that court at that time',
        )
    }

    return true
}

const mutations = {
    createSession: async (
        parent,
        {
            startTime: stringStartTime,
            address,
            duration,
            level,
            courtIndex,
            maxSlots,
        },
        { models, user },
    ) => {
        await isAdmin(models, user)

        const startTime = new Date(stringStartTime)
        // startTime.setMilliseconds(0)

        const endTime = new Date(
            new Date(startTime).setMinutes(startTime.getMinutes() + duration),
        )
        // endTime.setMilliseconds(0)

        const session = {
            address,
            startTime,
            endTime,
            duration,
            courtIndex,
            level,
            maxSlots,
            participants: [],
            author: mongoose.Types.ObjectId(user.id),
            lastUpdatedBy: mongoose.Types.ObjectId(user.id),
        }

        if (await sessionIsValid(session, models)) {
            return await models.Session.create(session)
        }
    },

    updateSession: async (parent, { id, ...args }, { models, user }) => {
        await isAdmin(models, user)

        //find the session
        const session = await models.Session.findById(id)
        if (!session) {
            throw new ForbiddenError(`Session with id ${id} does not exist`)
        }

        // Getting time info from args or stored session (since args are passed optionally)
        const timeInfo = {
            startTime: args.startTime ? args.startTime : session.startTime,
            duration: args.duration ? args.duration : session.duration,
        }

        args.startTime = new Date(timeInfo.startTime)
        args.endTime = new Date(
            new Date(timeInfo.startTime).setMinutes(
                timeInfo.startTime.getMinutes() + timeInfo.duration,
            ),
        )

        const updatedSession = {
            ...session,
            ...args,
            lastUpdatedBy: mongoose.Types.ObjectId(user.id),
        }

        if (await sessionIsValid(updatedSession, models)) {
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
        }
    },

    deleteSession: async (parent, { id }, { models, user }) => {
        await isAdmin(models, user)

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

    createBooking: async (parent, { userID, sessionID }, { models, user }) => {
        await isLoggedIn(models, user)
        if (user.id !== userID) {
            await isAdmin(models, user)
        }

        const dbUser = await models.User.findById(userID)
        // TODO make 3 a configurable value
        const userSessions = await getUserSessions(dbUser, {}, { models })
        if (userSessions.length === dbUser.maxSessions) {
            throw new ForbiddenError('You have used all of your bookings')
        }

        // find session
        const session = await models.Session.findById(sessionID)

        // TODO uncomment this some day
        if (
            new Date() >
            session.startTime.setMinutes(
                session.startTime.getMinutes() + session.duration,
            )
        ) {
            throw new ForbiddenError('This session has ended!')
        }

        // if session full throw an error
        if (session.participants.length === session.maxSlots) {
            throw new ForbiddenError('This session is fully booked')
        }
        // if already booked return session
        const hasBooked = session.participants.indexOf(dbUser.id)
        if (hasBooked != -1) {
            return session
        } else {
            return await models.Session.findByIdAndUpdate(
                sessionID,
                {
                    $push: {
                        participants: mongoose.Types.ObjectId(dbUser.id),
                    },
                },
                {
                    new: true,
                },
            )
        }
    },

    deleteBooking: async (parent, { userID, sessionID }, { models, user }) => {
        await isLoggedIn(models, user)
        if (user.id !== userID) {
            await isAdmin(models, user)
        }

        const dbUser = await models.User.findById(userID)

        // find session
        const session = await models.Session.findById(sessionID)
        // if already booked then remove
        const hasBooked = session.participants.indexOf(dbUser.id)
        if (hasBooked != -1) {
            return await models.Session.findByIdAndUpdate(
                sessionID,
                {
                    $pull: {
                        participants: mongoose.Types.ObjectId(dbUser.id),
                    },
                },
                {
                    new: true,
                },
            )
        } else {
            // if not booked then return session
            // TODO: if not booked should an error be thrown?
            return session
        }
    },

    signUp: async (parent, { link_uuid, username, password }, { models }) => {
        //check signUp link id
        const linkRecord = await models.UniqueLink.findOne({
            uuid: link_uuid,
            signUp: true,
        })
        if (!linkRecord) {
            throw new ForbiddenError('This link is broken')
        }
        const { email } = linkRecord

        // hash the password
        const hashed = await bcrypt.hash(password, 10)
        // Store user in the DB
        try {
            await models.User.create({
                username,
                email,
                password: hashed,
                admin: false,
                maxSessions: process.env.MAX_SESSIONS_DEFAULT,
            })
            await models.UniqueLink.findOneAndDelete({
                uuid: link_uuid,
                signUp: true,
            })
            return true
        } catch (err) {
            console.log(err)
            throw new Error('Error creating account')
        }
    },

    resetPassword: async (parent, { link_uuid, password }, { models }) => {
        //check signUp link id
        const linkRecord = await models.UniqueLink.findOne({
            uuid: link_uuid,
            signUp: false,
        })
        if (!linkRecord) {
            throw new ForbiddenError('This link is broken')
        }
        const { email } = linkRecord

        const hashed = await bcrypt.hash(password, 10)
        // Store user in the DB
        try {
            await models.User.findOneAndUpdate(
                {
                    email,
                },
                {
                    $set: {
                        password: hashed,
                    },
                },
            )
            await models.UniqueLink.findOneAndDelete({
                uuid: link_uuid,
                signUp: false,
            })
            return true
        } catch (err) {
            console.log(err)
            throw new Error('Error creating account')
        }
    },

    signIn: async (parent, { email, password }, { models }) => {
        if (email) {
            //normalise email
            email = email.trim().toLowerCase()
        }

        const user = await models.User.findOne({ email })

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
        // https://hasura.io/blog/best-practices-of-using-jwt-with-graphql/#:~:text=This%20is%20why%20JWTs%20have,JWTs%20don't%20get%20leaked.
        return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        })
    },

    createLink: async (parent, { email }, { models, user }) => {
        // check if email supplied exists (forgot pass)
        const userExists = await models.User.findOne({ email })
        const linkExists = await models.UniqueLink.findOne({
            email,
        })

        if (!user) {
            //if user not logged in then either forgot pass OR forgot signup
            //if user does not exist AND link does not exist then bad request
            if (!userExists && !linkExists) {
                throw new AuthenticationError('Email not found')
            }
            if (userExists) {
                console.log('creating forgot password link')
            } else if (linkExists) {
                console.log('re-sending first time signup link')
            }
        } else {
            //user is signed in, check if admin
            user_profile = await models.User.findById(user.id)
            if (!user_profile.admin) {
                throw new ForbiddenError(
                    'You must be an admin to generate links',
                )
            } else {
                console.log('adding new user to database')
            }
        }

        //if link exists remove it to create new one
        const removed = await models.UniqueLink.findOneAndDelete({
            email,
        })
        //if user is admin or if unsigned user requests to create link for an account that exists
        //create a link for them
        //TODO generate email

        const link_ext = uuidv4()
        const link = `${process.env.FRONTEND_ADDRESS}/${
            userExists ? 'reset' : 'signup'
        }/${link_ext}`
        const prompt = userExists ? 'Reset Your Password' : 'Create an Account'

        const msg = {
            to: email, // Change to your recipient
            from: 'zcabhra@ucl.ac.uk', // Change to your verified sender
            subject: `UCL Tennis Society - ${prompt}`,
            html: uniqueLinkEmail(prompt, email, link),
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch(error => {
                console.error(error)
            })

        console.log(`creating new link: ${link}`)
        const newLink = await models.UniqueLink.create({
            uuid: link_ext,
            email,
            signUp: !userExists,
        })

        return true
    },

    createAdminAccount: async (parent, { secretKey }, { models }) => {
        if (!process.env.createAdminSecretKey || !process.env.adminPassword) {
            throw new AuthenticationError(
                'ERROR: admin secret key/password not set in env file!',
            )
        }

        if (secretKey !== process.env.createAdminSecretKey) {
            throw new AuthenticationError('Incorrect secretKey')
        }

        const existingAdmin = await models.User.findOne({
            email: 'admin@ucltennis.com',
            admin: true,
        })

        if (existingAdmin) {
            throw new ForbiddenError('Admin account already exists!')
        }

        // create an admin account
        const hashed = await bcrypt.hash(process.env.adminPassword, 10)
        await models.User.create({
            username: 'Admin',
            email: 'admin@ucltennis.com',
            password: hashed,
            admin: true,
            maxSessions: 100,
        })

        return true
    },
}

module.exports = {
    ...mutations,
}

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
const { isAdmin, isLoggedIn } = require('./auth')
//SendGrid emailer setup API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const mutations = {
    createSession: async (
        parent,
        { startTime, address, duration, level, courtIndex, maxSlots },
        { models, user },
    ) => {
        await isAdmin(models, user)

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

    updateSession: async (parent, { id, ...args }, { models, user }) => {
        await isAdmin(models, user)

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
        if (userSessions.length === 3) {
            throw new ForbiddenError('You have used all of your bookings')
        }

        // find session
        const session = await models.Session.findById(sessionID)

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
            html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">

            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
              <title>${prompt}</title>
              <style type="text/css">
              body {margin: 0; padding: 0; min-width: 100%!important;}
              img {height: auto;}
              .content {width: 100%; max-width: 600px;}
              .header {padding: 40px 30px 20px 30px;}
              .innerpadding {padding: 30px 30px 30px 30px;}
              .borderbottom {border-bottom: 1px solid #f2eeed;}
              .subhead {font-size: 15px; color: #ffffff; font-family: sans-serif; letter-spacing: 10px;}
              .h1, .h2, .bodycopy {color: #153643; font-family: sans-serif;}
              .h1 {color: #ffffff; font-size: 33px; line-height: 38px; font-weight: bold;}
              .h2 {padding: 0 0 15px 0; font-size: 24px; line-height: 28px; font-weight: bold;}
              .bodycopy {font-size: 16px; line-height: 22px;}
              .button {text-align: center; font-size: 18px; font-family: sans-serif; font-weight: bold; padding: 0 30px 0 30px;}
              .button a {color: #ffffff; text-decoration: none;}
              .footer {padding: 20px 30px 15px 30px;}
              .footercopy {font-family: sans-serif; font-size: 14px; color: #ffffff;}
              .footercopy a {color: #ffffff; text-decoration: underline;}

              @media only screen and (max-width: 550px), screen and (max-device-width: 550px) {
              body[yahoo] .hide {display: none!important;}
              body[yahoo] .buttonwrapper {background-color: transparent!important;}
              body[yahoo] .button {padding: 0px!important;}
              body[yahoo] .button a {background-color: #e05443; padding: 15px 15px 13px!important;}
              }

              </style>
            </head>

            <body yahoo bgcolor="#f5f5f7">
            <table width="100%" bgcolor="#f5f5f7" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table bgcolor="#ffffff" class="content" align="center" cellpadding="0" cellspacing="0" border="0" >
                  <tr>
                    <td bgcolor="#082244" class="header">
                      <table width="70" align="left" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td height="70" style="padding: 0 20px 20px 0;">
                            <!-- <img class="fix" src="" width="70" height="70" border="0" alt="" /> -->
                          </td>
                        </tr>
                      </table>
                      <table class="col425" align="left" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 425px;">
                        <tr>
                          <td height="70">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td class="subhead" style="padding: 0 0 0 3px;">
                                  UCL TENNIS SOCIETY
                                </td>
                              </tr>
                              <tr>
                                <td class="h1" style="padding: 5px 0 0 0;">
                                  ${prompt}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="innerpadding borderbottom">
                      <table class="col380" align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 380px;">
                        <tr>
                          <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td class="bodycopy">
                                  Dear ${email.substr(
                                      0,
                                      email.indexOf('@'),
                                  )}, <br><br> Click below to ${prompt.toLowerCase()}:
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 20px 0 0 0;">
                                  <table align="center" class="buttonwrapper" bgcolor="#e05443" border="0" cellspacing="0" cellpadding="0" >
                                    <tr>
                                      <td class="button" height="45">
                                        <a href="${link}">${prompt.substr(
                0,
                prompt.indexOf(' '),
            )}</a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td class="footer" bgcolor="#44525f">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" class="footercopy">
                            &reg; UCL Tennis Society 2020<br/>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 20px 0 0 0;">
                            <table border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td width="37" style="text-align: center; padding: 0 10px 0 10px;">
                                  <a href="http://www.facebook.com/ucltennis">
                                    <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/210284/facebook.png" width="37" height="37" alt="Facebook" border="0" />
                                  </a>
                                </td>

                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
            </body>
            </html>
`,
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
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
        })

        return true
    },
}

const loggedMutations = {}
Object.keys(mutations).forEach((mutationName) => {
    loggedMutations[mutationName] = (parent, args, { models, user }) => {
        const blurredArgs = { ...args }
        if ('password' in blurredArgs) {
            blurredArgs.password = '********'
        }
        console.log(
            `mutation ${mutationName} called with args ${JSON.stringify(
                blurredArgs,
            )} and user ${JSON.stringify(user)}`,
        )
        return mutations[mutationName](parent, args, { models, user })
    }
})

module.exports = {
    ...loggedMutations,
}

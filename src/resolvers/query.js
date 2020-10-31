const { model } = require('../models/user')
const { isLoggedIn, isAdmin } = require('./auth')

const queries = {
    sessions: async (parent, args, { models }) => {
        return (
            await models.Session.find({ endTime: { $gte: new Date() } })
        ).sort((a, b) => a.startTime - b.startTime)
    },
    session: async (parent, args, { models }) => {
        return await models.Session.findById(args.id)
    },
    user: async (parent, { fullName }, { models }) => {
        return await models.User.findOne({ fullName })
    },
    users: async (parent, args, { models, user }) => {
        await isAdmin(models, user)
        return await models.User.find({})
    },
    me: async (parent, args, { models, user }) => {
        // find a user given the current user context
        return await models.User.findById(user.id)
    },
}
const authenticatedQueries = {}
Object.keys(queries).forEach((queryName) => {
    authenticatedQueries[queryName] = async (
        parent,
        args,
        { models, user },
    ) => {
        await isLoggedIn(models, user)
        return queries[queryName](parent, args, { models, user })
    }
})

module.exports = {
    ...authenticatedQueries,
    verifyLink: async (parent, { uuid, signUp }, { models }) => {
        // check if record exists
        const link = await models.UniqueLink.findOne({ uuid, signUp })
        return {
            success: !!link,
            email: link ? link.email : undefined,
        }
    },
    // TODO need to add queries for members and coordinators
}

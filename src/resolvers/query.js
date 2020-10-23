const {isLoggedIn, isAdmin} = require('./auth')

const queries = {
    sessions: async (parent, args, { models }) => {
        return await models.Session.find()
    },
    session: async (parent, args, { models }) => {
        return await models.Session.findById(args.id)
    },
    user: async (parent, { username }, { models }) => {
        return await models.User.findOne({ username })
    },
    users: async (parent, args, { models, user }) => {
        await isAdmin(models, user.id);
        return await models.User.find({})
    },
    me: async (parent, args, { models, user }) => {
        // find a user given the current user context
        return await models.User.findById(user.id)
    },
}
const authenticatedQueries = {};
Object.keys(queries).forEach(queryName => {
    authenticatedQueries[queryName] = async (parent, args, {models, user}) => {
        console.log(`query ${queryName} called with args ${JSON.stringify(args)} and user ${user.id}`);
        await isLoggedIn(models, user.id);
        return queries[queryName](parent, args, {models, user});
    }
})

module.exports = {
    ...authenticatedQueries,
    verifyLink: async (parent, { uuid, signUp }, { models }) => {
        // check if record exists
        const link = await models.UniqueLink.findOne({ uuid, signUp })
        return !!link
    },
    // TODO need to add queries for members and coordinators
}

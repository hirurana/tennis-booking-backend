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
        await isAdmin(models, user);
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
        if(queryName !== 'me' && queryName !== 'sessions') {
            console.log(`query ${queryName} called with args ${JSON.stringify(args)} and user ${JSON.stringify(user)}`);
        }
        await isLoggedIn(models, user);
        return queries[queryName](parent, args, {models, user});
    }
})

module.exports = {
    ...authenticatedQueries,
    verifyLink: async (parent, { uuid, signUp }, { models }) => {
        console.log(`verifyLink called with args ${uuid} ${signUp}`);
        // check if record exists
        const link = await models.UniqueLink.findOne({ uuid, signUp })
        console.log(`link found: ${JSON.stringify(link)}`);
        return !!link
    },
    // TODO need to add queries for members and coordinators
}

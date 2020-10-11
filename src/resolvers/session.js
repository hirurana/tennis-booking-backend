module.exports = {
    author: async (session, args, { models }) => {
        return await models.User.findById(session.author)
    },
    lastUpdatedBy: async (session, args, { models }) => {
        return await models.User.findById(session.lastUpdatedBy)
    },
    participants: async (session, args, { models }) => {
        return await models.User.find({ _id: { $in: session.participants } })
    },
}

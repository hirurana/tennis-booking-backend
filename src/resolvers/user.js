module.exports = {
    user_sessions: async (user, args, { models }) => {
        return await models.Session.find({ participants: user._id }).sort({
            _id: -1,
        })
    },
}

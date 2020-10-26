module.exports = {
    sessions: async (user, args, { models }) => {
        const sessions = await models.Session.find({
            participants: user._id,
            endTime: { $gte: new Date() },
        })
        // sorting sessions in ascending starttime order
        // filtering sessions to only include ones that haven't finished yet
        return sessions.sort((a, b) => a.startTime - b.startTime)
    },
}

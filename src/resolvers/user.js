module.exports = {
    sessions: async (user, args, { models }) => {
        const sessions = await models.Session.find({
            participants: user._id,
        })
        // sorting sessions in ascending starttime order
        // filtering sessions to only include ones that haven't finished yet
        return sessions
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
            .filter(
                (session) =>
                    new Date() <=
                    new Date(session.startTime).setHours(
                        new Date(session.startTime).getHours() +
                            session.duration,
                    ),
            )
    },
}

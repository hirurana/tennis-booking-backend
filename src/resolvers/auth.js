const isLoggedIn = async (models, userId) => {
    const user = await models.User.findById(userId)
    if (!user) {
        throw new AuthenticationError(
            `You must be signed in to do this`,
        )
    }
}

const isAdmin = async (models, userId) => {
    await isLoggedIn(userId);
    const user = await models.User.findById(userId)
    if (!user.admin) {
        throw new AuthenticationError(
            `You must be admin to do this`,
        )
    }
}

module.exports = {isLoggedIn, isAdmin}
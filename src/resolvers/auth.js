const { AuthenticationError } = require("apollo-server-express")

const isLoggedIn = async (models, user) => {
    if(!user) {
        throw new AuthenticationError(
            `You must be signed in to do this`,
        )
    }
    const dbUser = await models.User.findById(user.id)
    if (!dbUser) {
        throw new AuthenticationError(
            `You must be signed in to do this`,
        )
    }
}

const isAdmin = async (models, user) => {
    await isLoggedIn(models, user)
    const dbUser = await models.User.findById(user.id)
    if (!dbUser.admin) {
        throw new AuthenticationError(
            `You must be admin to do this`,
        )
    }
}

module.exports = {isLoggedIn, isAdmin}
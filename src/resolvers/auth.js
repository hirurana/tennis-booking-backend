const { AuthenticationError } = require("apollo-server-express")

const isLoggedIn = async (models, user) => {
    if(!user) {
        console.log('user undefined');
        throw new AuthenticationError(
            `You must be signed in to do this`,
        )
    }
    const dbUser = await models.User.findById(user.id)
    if (!dbUser) {
        console.log(`user not in db: ${JSON.stringify(user)}`);
        throw new AuthenticationError(
            `You must be signed in to do this`,
        )
    }
}

const isAdmin = async (models, user) => {
    await isLoggedIn(models, user)
    const dbUser = await models.User.findById(user.id)
    if (!dbUser.admin) {
        console.log('user not admin');
        throw new AuthenticationError(
            `You must be admin to do this`,
        )
    }
}

module.exports = {isLoggedIn, isAdmin}
const mutations = require('./resolvers/mutation')
const queries = require('./resolvers/query')
const chalk = require('chalk')

const levels = {
    4: ['sessions'],
    3: ['session', 'me'],
    2: ['createBooking', 'deleteBooking', 'user', 'users'],
    1: ['createSession', 'updateSession', 'deleteSession', 'signIn'],
    0: [
        'signUp',
        'createLink',
        'createAdminAccount',
        'resetPassword',
        'verifyLink',
    ],
}

const flatLevels = {}
const combined = []
Object.keys(levels)
    .sort()
    .forEach((level) => {
        Object.values(levels[level]).forEach((item) => {
            combined.push(item)
        })
        flatLevels[level] = [...combined]
    })

const LOG_LEVEL = 1

module.exports = {
    reqLog: (req, user) => {
        if (flatLevels[LOG_LEVEL].indexOf(req.body.operationName) === -1) {
            return
        }
        let log = ''
        if (Object.keys(mutations).indexOf(req.body.operationName) !== -1) {
            log = chalk.red.bold('mutation:')
        } else if (
            Object.keys(queries).indexOf(req.body.operationName) !== -1
        ) {
            log = chalk.green('query:')
        }

        const blurredVariables = { ...req.body.variables }
        if ('password' in blurredVariables) {
            blurredVariables.password = '*******'
        }
        if ('confirmPassword' in blurredVariables) {
            blurredVariables.confirmPassword = '*******'
        }

        if (log.length) {
            console.log('===========')
            console.log(`${log} ${chalk.blue(req.body.operationName)}`)
            console.log('args:')
            console.log(blurredVariables)
            console.log('user:')
            console.log(user)
            console.log('===========')
        }
    },
}

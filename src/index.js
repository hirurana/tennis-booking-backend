const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const depthLimit = require('graphql-depth-limit')
const { createComplexityLimitRule } = require('graphql-validation-complexity')
const { ApolloServer, AuthenticationError } = require('apollo-server-express')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const db = require('./db')
const models = require('./models')
const typeDefs = require('./schema')
const resolvers = require('./resolvers')

//get the user info from a JWT
const getUser = (token) => {
    if (token) {
        try {
            // return the user information from the token
            return jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
            // if there is a problem with the token, throw an error
            throw new Error('Session invalid')
        }
    }
}

const port = process.env.PORT || 4000
const DB_HOST = process.env.DB_HOST

const app = express()

//app.use(helmet());
//app.use(cors());

//connect to DB
db.connect(DB_HOST)

//ApolloServer
const server = new ApolloServer({
    typeDefs,
    resolvers,
    //validationRules: [depthLimit(5), createComplexityLimitRule(1000)],
    context: ({ req }) => {
        // get the user token from the headers
        const token = req.headers.authorization
        let user
        try {
            // try to retrieve a user with the token
            // have to wrap this in try-catch since getUser on an expired token throws an error
            user = getUser(token)
        } catch {}
        // Add the db models and the user to the context
        return { models, user }
    },
    debug: true,
    tracing: true,
    introspection: true,
    playground: true,
})

//Apply middleware and set path to /api
server.applyMiddleware({ app, path: '/api' })

app.listen({ port }, () =>
    console.log(`GraphQL Server running on ${port}${server.graphqlPath}`),
)

const { gql } = require('apollo-server-express')

module.exports = gql`
    scalar DateTime
    type Session {
        id: ID!
        startTime: DateTime!
        endTime: DateTime!
        address: String!
        duration: Int!
        level: String!
        courtIndex: Int!
        maxSlots: Int!
        participants: [User!]
        author: User!
        lastUpdatedBy: User!
        createdAt: DateTime!
        updatedAt: DateTime!
    }
    type User {
        id: ID!
        fullName: String!
        email: String!
        admin: Boolean!
        sessions: [Session!]!
        maxSessions: Int!
    }
    type UniqueLink {
        id: ID!
        uuid: String!
        email: String!
        signUp: Boolean!
        createdAt: DateTime!
    }
    type LinkCheckResult {
        success: Boolean!
        email: String
    }
    type Query {
        sessions: [Session!]!
        session(id: ID!): Session!
        users: [User!]!
        user(fullName: String!): User
        me: User!
        verifyLink(uuid: String!, signUp: Boolean!): LinkCheckResult!
    }
    type Mutation {
        createSession(
            startTime: DateTime!
            address: String!
            duration: Int!
            level: String!
            courtIndex: Int!
            maxSlots: Int!
        ): Session!
        updateSession(
            id: ID!
            startTime: DateTime
            address: String
            duration: Int
            level: String
            courtIndex: Int
            maxSlots: Int
        ): Session!
        deleteSession(id: ID!): Boolean!
        createBooking(userID: ID!, sessionID: ID!): Session!
        deleteBooking(userID: ID!, sessionID: ID!): Session!
        signUp(
            link_uuid: String!
            fullName: String!
            password: String!
        ): Boolean!
        resetPassword(link_uuid: String!, password: String!): Boolean!
        signIn(email: String!, password: String!): String!
        createLink(email: String!): Boolean!
        createAdminAccount(secretKey: String!): Boolean!
    }
`

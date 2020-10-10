const { gql } = require('apollo-server-express')

module.exports = gql`
    scalar DateTime
    type Session {
        id: ID!
        startTime: DateTime!
        address: String!
        duration: Int!
        level: String!
        courtIndex: Int!
        maxSlots: Int!
        slotsBooked: Int!
        participants: [User!]
        author: User!
        lastUpdatedBy: User!
        createdAt: DateTime!
        updatedAt: DateTime!
    }
    type User {
        id: ID!
        username: String!
        email: String!
        admin: Boolean!
        sessions: [Session!]!
    }
    type UniqueLink {
        id: ID!
        email: String!
        createdBy: User!
        createdAt: DateTime!
    }
    type Query {
        sessions: [Session!]!
        session(id: ID!): Session!
        users: [User!]!
        user(username: String!): User
        me: User!
        verifyLink(uuid: String!): Boolean!
    }
    type Mutation {
        createSession(startTime: String!, maxSlots: Int!): Session!
        updateSession(id: ID!, startTime: String!, maxSlots: Int!): Session!
        deleteSession(id: ID!): Boolean!
        createBooking(id: ID!): Session!
        deleteBooking(id: ID!): Session!
        signUp(
            link_uuid: String!
            username: String!
            email: String!
            password: String!
        ): String!
        signIn(username: String, email: String, password: String!): String!
        createLink(email: String!): UniqueLink!
    }
`

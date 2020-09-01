const { gql } = require("apollo-server-express");

module.exports = gql`
  scalar DateTime
  type Session {
    id: ID!
    session_datetime: String!
    max_slots: Int!
    slots_booked: Int!
    participants: [User!]
    session_author: User!
    session_updated_by: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  type User {
    id: ID!
    username: String!
    email: String!
    user_sessions: [Session!]!
  }
  type Query {
    sessions: [Session!]!
    session(id: ID!): Session!
    user(username: String!): User
    users: [User!]!
    me: User!
  }
  type Mutation {
    createSession(session_datetime: String!, max_slots: Int!): Session!
    updateSession(id: ID!, session_datetime: String!, max_slots: Int!): Session!
    deleteSession(id: ID!): Boolean!
    createBooking(id: ID!): Session!
    deleteBooking(id: ID!): Session!
    signUp(username: String!, email: String!, password: String!): String!
    signIn(username: String, email: String, password: String!): String!
  }
`;

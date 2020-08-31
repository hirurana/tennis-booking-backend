const { gql } = require("apollo-server-express");

module.exports = gql`
  scalar DateTime
  type Session {
    id: ID!
    session_datetime: String!
    max_slots: Int!
    slots_avail: Int!
    session_author: User!
    session_updated_by: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  type Booking {
    id: ID!
    session_id: String!
    createdAt: DateTime!
  }
  type User {
    id: ID!
    username: String!
    email: String!
    bookings: [Booking!]!
  }
  type Query {
    sessions: [Session!]!
    session(id: ID!): Session!
    bookings: [Booking!]!
    booking(id: ID!): Booking!
    bookingsFor(session_id: String!): [Booking!]!
    user(username: String!): User
    users: [User!]!
    coordinators: [User!]!
    members: [User!]!
    me: User!
  }
  type Mutation {
    createSession(session_datetime: String!, max_slots: Int!): Session!
    updateSession(
      id: ID!
      session_datetime: String!
      max_slots: Int!
      slots_avail: Int!
    ): Session!
    deleteSession(id: ID!): Boolean!
    createBooking(session_id: String!): Booking!
    deleteBooking(id: ID!): Boolean!
    signUp(username: String!, email: String!, password: String!): String!
    signIn(username: String, email: String, password: String!): String!
  }
`;

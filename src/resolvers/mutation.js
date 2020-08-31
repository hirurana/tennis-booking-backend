// For encrypting passwords
const bcrypt = require("bcrypt");
// Dealing with tokens
const jwt = require("jsonwebtoken");
const {
  AuthenticationError,
  ForbiddenError
} = require("apollo-server-express");
const mongoose = require("mongoose");
require("dotenv").config();

module.exports = {
  createSession: async (parent, args, { models, user }) => {
    // if there is no user in the context throw an authentication error
    if (!user) {
      throw new AuthenticationError("You must be signed in to make a Session");
    }

    return await models.Session.create({
      session_datetime: args.session_datetime,
      max_slots: args.max_slots,
      slots_avail: args.max_slots,
      session_author: mongoose.Types.ObjectId(user.id),
      session_updated_by: mongoose.Types.ObjectId(user.id)
    });
  },
  //for simplicity UI pass a set of all params updated and original.
  // should change to only updating parts that user has changed
  // this means we need to change schema from required to optional
  updateSession: async (
    parent,
    { id, session_datetime, max_slots, slots_avail },
    { models, user }
  ) => {
    // if there is no user in the context throw an authentication error
    if (!user) {
      throw new AuthenticationError("You must be signed in to make a Session");
    }
    //find the session
    const session = await models.Session.findById(id);
    // if the session owner and current user don't match throw a ForbiddenError error
    if (session && String(session.session_author) != user.id) {
      // TODO: Change this to 'if user.id is not a R&D coordinator'
      throw new ForbiddenError(
        "You do not have permission to update this session"
      );
    }
    return await models.Session.findOneAndUpdate(
      {
        _id: id
      },
      {
        $set: {
          session_datetime,
          max_slots,
          session_updated_by: mongoose.Types.ObjectId(user.id)
        }
      },
      {
        new: true
      }
    );
  },
  deleteSession: async (parent, { id }, { models, user }) => {
    // if there is no user in the context throw an authentication error
    if (!user) {
      throw new AuthenticationError(
        "You must be signed in to delete a session"
      );
    }
    //find the session
    const session = await models.Session.findById(id);
    // if the session owner and current user don't match throw a ForbiddenError error
    if (session && String(session.session_author) != user.id) {
      // TODO: Change this to 'if user.id is not a R&D coordinator'
      throw new ForbiddenError(
        "You do not have permission to delete this session"
      );
    }
    try {
      await session.remove();
      return true;
    } catch (err) {
      return false;
    }
  },
  createBooking: async (parent, args, { models, user }) => {
    // if there is no user in the context throw an authentication error
    if (!user) {
      throw new AuthenticationError("You must be signed in to make a booking");
    }
    return await models.Booking.create({
      author: mongoose.Types.ObjectId(user.id),
      session_id: args.session_id
    });
  },
  deleteBooking: async (parent, { id }, { models, user }) => {
    // if there is no user in the context throw an authentication error
    if (!user) {
      throw new AuthenticationError("You must be signed in to make a booking");
    }
    // find the booking
    const booking = await models.Booking.findById(id);
    // if the booking owner and current user don't match throw a ForbiddenError error
    if (booking && String(booking.author) != user.id) {
      // TODO: Change this to 'if user.id is not a R&D coordinator'
      throw new ForbiddenError(
        "You do not have permission to delete this booking"
      );
    }
    try {
      await booking.remove();
      return true;
    } catch (err) {
      return false;
    }
  },
  signUp: async (parent, { username, email, password }, { models }) => {
    // normalise email address by trimming whitespaces and convert all to lower case
    email = email.trim().toLowerCase();
    // hash the password
    const hashed = await bcrypt.hash(password, 10);
    // Store user in the DB
    try {
      const user = await models.User.create({
        username,
        email,
        password: hashed
      });

      // create and return JWT
      return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    } catch (err) {
      console.log(err);
      throw new Error("Error creating account");
    }
  },
  signIn: async (parent, { username, email, password }, { models }) => {
    if (email) {
      //normalise email
      email = email.trim().toLowerCase();
    }

    const user = await models.User.findOne({
      $or: [{ email }, { username }]
    });

    //if no user found
    if (!user) {
      throw new AuthenticationError("Error signing in");
    }

    // if passwords don't match
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthenticationError("Error signing in");
    }

    //create and return the json web token
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  }
};

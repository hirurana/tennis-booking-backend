module.exports = {
  sessions: async (parent, args, { models }) => {
    return await models.Session.find();
  },
  session: async (parent, args, { models }) => {
    return await models.Session.findById(args.id);
  },
  bookings: async (parent, args, { models }) => {
    return await models.Booking.find();
  },
  booking: async (parent, args, { models }) => {
    return await models.Booking.findById(args.id);
  },
  bookingsFor: async (parent, args, { models }) => {
    // TODO: search for documents with a particular session id
    return await models.Booking.find({ session_id: args.session_id });
  },
  user: async (parent, { username }, { models }) => {
    return await models.User.findOne({ username });
  },
  users: async (parent, args, { models }) => {
    return await models.User.find({});
  },
  me: async (parent, args, { models, user }) => {
    // find a user given the current user context
    return await models.User.findById(user.id);
  }
  // need to add queries for members and coordinators
};

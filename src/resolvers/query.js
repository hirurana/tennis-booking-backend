module.exports = {
  sessions: async (parent, args, { models }) => {
    return await models.Session.find();
  },
  session: async (parent, args, { models }) => {
    return await models.Session.findById(args.id);
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
  },
  verifyLink: async (parent, { uuid }, { models }) => {
    // check if record exists
    link = await models.UniqueLink.findOne({ uuid });
    return !!link;
  }
  // need to add queries for members and coordinators
};

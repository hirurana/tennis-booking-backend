module.exports = {
  session_author: async (session, args, { models }) => {
    return await models.User.findById(session.session_author);
  },
  session_updated_by: async (session, args, { models }) => {
    return await models.User.findById(session.session_updated_by);
  },
  participants: async (session, args, { models }) => {
    return await models.User.find({ _id: { $in: session.participants } });
  }
};

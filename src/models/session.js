const mongoose = require("mongoose");

// Define session schema in the DB
const sessionSchema = new mongoose.Schema(
  {
    session_datetime: {
      type: String,
      required: true
    },
    max_slots: {
      type: Number,
      required: true
    },
    slots_avail: {
      type: Number,
      required: true
    },
    session_author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    session_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    // Assigns createdAt and updatedAt fields with a Date type
    timestamps: true
  }
);

// Define the session model with the schema
const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;

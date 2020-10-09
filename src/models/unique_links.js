const mongoose = require("mongoose");

// Define session schema in the DB
const uniqueLinksSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: { unique: true }
    },
    created_by: {
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
const UniqueLinks = mongoose.model("UniqueLinks", uniqueLinksSchema);

module.exports = UniqueLinks;

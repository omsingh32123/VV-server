const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    picture: { type: String },
    votedSongs: [{ type: Schema.Types.ObjectId, ref: "Vote" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

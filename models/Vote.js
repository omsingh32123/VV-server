const mongoose = require("mongoose");
const { Schema } = mongoose;

const voteSchema = new mongoose.Schema(
  {
    userId: { 
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
     },
    songId: { 
        type: Schema.Types.ObjectId,
        ref: "Song",
        required: true,
      },
    voteType: { type: String, enum: ["L", "Mid", "W"], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vote", voteSchema);

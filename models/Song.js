const mongoose = require("mongoose");
const { Schema } = mongoose;

const songSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true, unique: true }, // Unique track ID from Spotify
    name: { type: String, required: true },
    artists: [{ type: String, default: ["Unknown"] }],
    albumImage: { type: String, required: true },
    previewUrl: { type: String },
    votes: {
      L: { type: Number, default: 0 },
      Mid: { type: Number, default: 0 },
      W: { type: Number, default: 0 },
    },
    userVotes: [{ type: Schema.Types.ObjectId, ref: "Vote" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);

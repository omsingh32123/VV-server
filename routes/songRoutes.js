const express = require("express");
const router = express.Router();
const { getSongData, isSongVoted, castVote, getSongVotes, getMostVotedSongs, getSongVotersByType } = require("../controllers/songController");

router.post("/get-song-data/:trackId", getSongData);
router.post("/is-song-voted", isSongVoted);
router.post("/cast-vote", castVote);
router.post("/song-votes/:trackId", getSongVotes);
router.get("/most-voted", getMostVotedSongs);
router.get("/voters/:trackId", getSongVotersByType);

module.exports = router;
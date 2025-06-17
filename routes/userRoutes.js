const express = require("express");
const router = express.Router();
const { createUser, getVotedSongs, getUser, getTopVoters } = require("../controllers/userController");

router.post("/create", createUser);
router.post("/get-user", getUser);
router.get("/get-voted-songs/:userId", getVotedSongs);
router.get("/top-voters", getTopVoters);

module.exports = router;
const express = require("express");
const { searchSongs, getSongDetails } = require("../controllers/spotifyController");

const router = express.Router();

router.get("/search", searchSongs);
router.get("/get-song/:trackId", getSongDetails);

module.exports = router;
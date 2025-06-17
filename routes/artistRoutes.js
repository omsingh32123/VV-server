const express = require("express");
const router = express.Router();
const { getTopArtists } = require("../controllers/artistController");

router.get("/top", getTopArtists); // Route for Top Artists page

module.exports = router; 
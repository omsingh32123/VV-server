const express = require("express");
const router = express.Router();
const { generateTestData } = require("../controllers/testDataController");

router.get("/generate-data", generateTestData);

module.exports = router; 
const axios = require("axios");
require("dotenv").config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiration = null; // To track expiration

// Function to Get a New Token
const getSpotifyToken = async () => {
  if (accessToken && tokenExpiration > Date.now()) {
    return accessToken; // Return cached token if still valid
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + response.data.expires_in * 1000; // Store expiration time
    return accessToken;
  } catch (error) {
    console.error("Error getting Spotify token:", error.response?.data || error.message);
    throw new Error("Failed to get Spotify token");
  }
};

// Search Songs on Spotify (Public API)
const searchSongs = async (req, res) => {
  const { query, limit = 50, offset = 0 } = req.query;
  if (!query) return res.status(400).json({ error: "Query parameter is required" });

  try {
    // Ensure limit is within Spotify's allowed range (max 50)
    const safeLimit = Math.min(parseInt(limit), 50);
    const safeOffset = parseInt(offset);
    
    console.log(`Searching Spotify with query: ${query}, limit: ${safeLimit}, offset: ${safeOffset}`);
    const token = await getSpotifyToken(); // Ensure token is fresh
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        q: query, 
        type: "track", 
        limit: safeLimit, 
        offset: safeOffset 
      },
    });

    console.log(`Received ${response.data.tracks.items.length} tracks from Spotify`);
    res.json(response.data.tracks.items);
  } catch (error) {
    console.error("Spotify API Error:", error.response?.data || error.message);
    if (error.response?.status === 429) {
      res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch data from Spotify",
        details: error.response?.data || error.message
      });
    }
  }
};

// Get Song Details from Spotify
const getSongDetails = async (req, res) => {
  const { trackId } = req.params; // Extract trackId from URL params
  if (!trackId) return res.status(400).json({ error: "Track ID is required" });

  try {
    const token = await getSpotifyToken(); // Ensure token is fresh
    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Spotify API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch song details from Spotify" });
  }
};

// Get Song Details from Spotify For Local Use
const getSongDetailsForLocalUse = async (trackId) => {
  if (!trackId)  return { success: false};

  try {
    const token = await getSpotifyToken(); // Ensure token is fresh
    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(response.data);
    
    return { success: true, data: response.data};
  } catch (error) {
    console.error("Spotify API Error:", error.response?.data || error.message);
    return { success: false};
  }
};

module.exports = { searchSongs, getSongDetails, getSongDetailsForLocalUse };

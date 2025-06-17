const Song = require("../models/Song");
const Vote = require("../models/Vote");
const { getSongDetailsForLocalUse } = require("./spotifyController");
require("dotenv").config();

// Get top artists based on votes across all their songs
const getTopArtists = async (req, res) => {
    const { limit = 20 } = req.query;
    
    try {
        console.log(`Fetching top artists with limit: ${limit}`);
        
        // Get a count of total songs in the database
        const totalSongs = await Song.countDocuments();
        console.log(`Total songs in database: ${totalSongs}`);
        
        // Get a count of songs with at least one vote
        const songsWithVotes = await Song.countDocuments({
            $or: [
                { 'votes.L': { $gt: 0 } },
                { 'votes.Mid': { $gt: 0 } },
                { 'votes.W': { $gt: 0 } }
            ]
        });
        console.log(`Songs with votes: ${songsWithVotes}`);
        
        // First, group songs by artist and calculate total votes
        const artistsWithVotes = await Song.aggregate([
            // Unwind artists array to handle songs with multiple artists
            { $unwind: "$artists" },
            // Group by artist
            {
                $group: {
                    _id: "$artists",
                    songs: { $push: { id: "$trackId", name: "$name", image: "$albumImage", votes: "$votes" } },
                    // Count total votes per type
                    totalWVotes: { $sum: "$votes.W" },
                    totalMidVotes: { $sum: "$votes.Mid" },
                    totalLVotes: { $sum: "$votes.L" }
                }
            },
            // Add fields for total calculations
            {
                $addFields: {
                    totalVotes: { $sum: ["$totalWVotes", "$totalMidVotes", "$totalLVotes"] },
                    songCount: { $size: "$songs" }
                }
            },
            // Only include artists with votes
            { $match: { totalVotes: { $gt: 0 } } },
            // Sort by total votes
            { $sort: { totalVotes: -1 } },
            // Limit results
            { $limit: parseInt(limit) }
        ]);

        console.log(`Aggregation returned ${artistsWithVotes.length} artists`);
        if (artistsWithVotes.length === 0) {
            console.log("No artists were found with votes");
        } else {
            console.log("Sample of first artist:", JSON.stringify(artistsWithVotes[0]._id));
            console.log("Sample vote counts:", JSON.stringify({
                W: artistsWithVotes[0].totalWVotes,
                Mid: artistsWithVotes[0].totalMidVotes,
                L: artistsWithVotes[0].totalLVotes,
                Total: artistsWithVotes[0].totalVotes
            }));
        }

        // Format response for frontend
        const formattedArtists = artistsWithVotes.map(artist => {
            // Find the song with the best image to use as artist image
            const songWithImage = artist.songs.find(song => song.image);
            const artistImage = songWithImage ? songWithImage.image : null;

            return {
                id: artist._id,
                name: artist._id,
                image: artistImage,
                songCount: artist.songCount,
                totalVotes: artist.totalVotes,
                votes: {
                    W: artist.totalWVotes,
                    Mid: artist.totalMidVotes,
                    L: artist.totalLVotes
                }
            };
        });

        console.log(`Returning ${formattedArtists.length} formatted artists`);
        return res.status(200).json(formattedArtists);
    } catch (error) {
        console.error("Error fetching top artists:", error);
        res.status(500).json({ message: "Error fetching top artists", error: error.message });
    }
};

module.exports = { getTopArtists }; 
const Song = require("../models/Song");
const User = require("../models/User");
const Vote = require("../models/Vote");
const { getSongDetailsForLocalUse } = require("./spotifyController");
require("dotenv").config();

// Generate test data for the application
const generateTestData = async (req, res) => {
    try {
        console.log("Starting test data generation");
        
        // Check if we already have data
        const existingSongs = await Song.countDocuments();
        const existingUsers = await User.countDocuments();
        const existingVotes = await Vote.countDocuments();
        
        console.log(`Current DB state: ${existingSongs} songs, ${existingUsers} users, ${existingVotes} votes`);
        
        // Define sample track IDs from Spotify (popular songs)
        const sampleTrackIds = [
            '06JvOZ39sK8D8SqiqfaxDU', // Stay - The Kid LAROI, Justin Bieber
            '7MXVkk9YMctZqd1Srtv4MB', // Levitating - Dua Lipa
            '4ZtFanR9U6ndgddUvNcjcG', // Good 4 U - Olivia Rodrigo
            '4iJyoBOLtHqaGxP12qzhQI', // Peaches - Justin Bieber
            '0k4d5YPDr1r7FX77VdqWez', // Don't Start Now - Dua Lipa
            '0SIAFU49FFHwR3QnT5Jx0k', // SG - DJ Snake
            '5ZodUIzosQHQXf3uxxSWt0', // Dakiti - Bad Bunny
            '21jGcNKet2qwijlDFuPiPb', // Circles - Post Malone
            '2SAqBLGA283SUiwJ3xOUVI', // Blinding Lights - The Weeknd
            '3iw6V4LH7yPj1acWsm9O4l'  // Watermelon Sugar - Harry Styles
        ];
        
        // Create test users if needed
        let users = [];
        if (existingUsers < 5) {
            console.log("Creating test users");
            const testUsers = [
                { name: "Test User 1", email: "user1@test.com", picture: "https://randomuser.me/api/portraits/men/1.jpg" },
                { name: "Test User 2", email: "user2@test.com", picture: "https://randomuser.me/api/portraits/women/2.jpg" },
                { name: "Test User 3", email: "user3@test.com", picture: "https://randomuser.me/api/portraits/men/3.jpg" },
                { name: "Test User 4", email: "user4@test.com", picture: "https://randomuser.me/api/portraits/women/4.jpg" },
                { name: "Test User 5", email: "user5@test.com", picture: "https://randomuser.me/api/portraits/men/5.jpg" }
            ];
            
            for (const userData of testUsers) {
                const existingUser = await User.findOne({ email: userData.email });
                if (!existingUser) {
                    const user = await User.create(userData);
                    users.push(user);
                    console.log(`Created user: ${user.name}`);
                } else {
                    users.push(existingUser);
                    console.log(`User already exists: ${existingUser.name}`);
                }
            }
        } else {
            console.log("Using existing users");
            users = await User.find().limit(5);
        }
        
        // Create songs and votes
        let createdSongs = 0;
        let createdVotes = 0;
        
        for (const trackId of sampleTrackIds) {
            // Check if song exists
            let song = await Song.findOne({ trackId });
            
            // If not, fetch from Spotify and create
            if (!song) {
                const songData = await getSongDetailsForLocalUse(trackId);
                if (songData.success) {
                    const { name, artists } = songData.data;
                    const artistNames = artists.map(artist => artist.name);
                    const albumImage = songData.data.album.images[0]?.url;
                    const previewUrl = songData.data.preview_url;
                    
                    song = await Song.create({
                        trackId,
                        name,
                        artists: artistNames,
                        albumImage,
                        previewUrl,
                        votes: { L: 0, Mid: 0, W: 0 },
                        userVotes: []
                    });
                    
                    console.log(`Created song: ${song.name} by ${song.artists.join(', ')}`);
                    createdSongs++;
                }
            } else {
                console.log(`Song already exists: ${song.name}`);
            }
            
            // Create votes for this song
            if (song) {
                // Distribute different types of votes
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    
                    // Skip if user already voted for this song
                    const existingVote = await Vote.findOne({ userId: user._id, songId: song._id });
                    if (existingVote) {
                        console.log(`User ${user.name} already voted for ${song.name}`);
                        continue;
                    }
                    
                    // Determine vote type based on index (distribute types)
                    let voteType;
                    if (i % 3 === 0) voteType = "L";
                    else if (i % 3 === 1) voteType = "Mid";
                    else voteType = "W";
                    
                    // Create the vote
                    const vote = await Vote.create({
                        userId: user._id,
                        songId: song._id,
                        voteType
                    });
                    
                    // Update song vote count
                    song.votes[voteType]++;
                    song.userVotes.push(vote._id);
                    await song.save();
                    
                    // Update user's voted songs
                    user.votedSongs.push(vote._id);
                    await user.save();
                    
                    console.log(`Created ${voteType} vote by ${user.name} for ${song.name}`);
                    createdVotes++;
                }
            }
        }
        
        console.log(`Test data generation complete: ${createdSongs} songs and ${createdVotes} votes created`);
        
        res.status(200).json({
            message: "Test data generation complete",
            stats: {
                songsCreated: createdSongs,
                votesCreated: createdVotes,
                totalSongs: await Song.countDocuments(),
                totalUsers: await User.countDocuments(),
                totalVotes: await Vote.countDocuments()
            }
        });
    } catch (error) {
        console.error("Error generating test data:", error);
        res.status(500).json({ message: "Error generating test data", error: error.message });
    }
};

module.exports = { generateTestData }; 
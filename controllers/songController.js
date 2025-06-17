const Song = require("../models/Song");
const User = require("../models/User");
const Vote = require("../models/Vote");
const { getSongDetailsForLocalUse } = require("./spotifyController");
require("dotenv").config();

const createSong = async (data) => {
    var { trackId, name, artists, albumImage } = data;
    if(!trackId || !name || !artists || !albumImage ) {
        console.log("this 1");
        
        return { success: false, song: null };
    }
    console.log("step 1");
    try {
        const song = await Song.findOne({ trackId });
        console.log("step 2");
        if (song) {
            console.log("this 2");
            return { success: true, song: song };
        }
        console.log("step 3");
        const newSong = await Song.create({ trackId, name, artists, albumImage });
        
    console.log("step 4", newSong);
        if (newSong) {
            console.log("this 3");
            return { success: true, song: newSong };
        } else {
            console.log("this 4");
            return { success: false, song: null };
        }
        console.log("step 5");
    } catch (error) {
        console.log("this 5");
        return { success: false, song: null };
    }
};

// Fetch song details along with votes
const getSongData = async (req, res) => {
    const { trackId } = req.params;
    try {
        if(!trackId) {
            return res.status(400).json({ message: "Missing required fields" });
        } else if(trackId) {
            const song = await Song.findOne({ trackId: trackId });
            if(!song) {
                const songDataResponse = await getSongDetailsForLocalUse(trackId);
                if(!songDataResponse.success) {
                    return res.status(400).json({ message: "Song not found" });
                }
                const { name, artists } = songDataResponse.data;
                const previewUrl = songDataResponse.data.preview_url;
                const albumImage = songDataResponse.data.album.images[0]?.url;
                const newSong = await createSong({ trackId, name, artists, albumImage, previewUrl });
                if (!newSong.success) {
                    return res.status(500).json({ message: "Error creating song" });
                }
                return res.status(200).json({ message: "Song fetched successfully", song: newSong.song });
            }
            return res.status(200).json({ message: "Song fetched successfully", song: song });
        } 
    } catch (error) {
        res.status(500).json({ message: "Error while fetching songs", error });
    }
};

// Check if a user has already voted on a specific song
const isSongVoted = async (req, res) => {
    var { trackId, songId, userId } = req.body;
    try {
        if((!trackId && !songId) || !userId) {
            return res.status(400).json({ message: "Missing required fields" });
        } 
        if(!songId) {
            const song = await Song.findOne({ trackId: trackId });
            if(!song) {
                return res.status(200).json({ message: "Song not voted", hasVoted: false });
            }
            songId = song._id;
        }
        const vote = await Vote.findOne({ userId: userId, songId: songId });
        if (vote) {
            return res.status(200).json({ message: "Song already voted", hasVoted: true, voteType: vote.voteType });
        } else {
            return res.status(200).json({ message: "Song not voted", hasVoted: false });
        }
    } catch (error) {
        res.status(500).json({ message: "Error while fetching vote details", error });
    }
};

// Cast a vote for a song
const castVote = async (req, res) => {
    var { trackId, songId, userId, voteType } = req.body;
    try {
        if((!trackId && !songId) || !userId || !voteType) {
            return res.status(400).json({ message: "Missing required fields" });
        } 
        if(!songId) {
            var song = await Song.findOne({ trackId: trackId });
            if(!song) {
                const songDataResponse = await getSongDetailsForLocalUse(trackId);
                if(!songDataResponse.success) {
                    return res.status(400).json({ message: "Song not found" });
                }
                const { name, artists } = songDataResponse.data;
                const artistNames = artists.map((artist) => artist.name);
                const previewUrl = songDataResponse.data.preview_url;
                const albumImage = songDataResponse.data.album.images[0]?.url;                
                const newSong = await createSong({ trackId, name, artists: artistNames, albumImage, previewUrl });
                if (!newSong) {
                    return res.status(500).json({ message: "Error creating song" });
                }
                song = newSong.song;
            }
            songId = song._id;
        }
        const vote = await Vote.findOne({ userId: userId, songId: songId });
        if (vote) {
            const song = await Song.findOne({ _id: songId });
            const tempVotes = {...song.votes};
            return res.status(200).json({ message: "Song already voted", hasVoted: true, votes: tempVotes  });
        } else {
            const newVote = await Vote.create({ userId: userId, songId: songId, voteType: voteType });
            if (newVote) {
                // Updating votes data in Song
                const song = await Song.findOne({ _id: songId });
                const tempVotes = {...song.votes};
                const tempUserVotes = [...song.userVotes];
                tempVotes[voteType] = tempVotes[voteType] + 1;
                song.votes = tempVotes;
                song.userVotes = [...tempUserVotes, newVote._id];
                await song.save();
                // Updating votes data in User
                const user = await User.findOne({ _id: userId });
                const tempvotedSongs = user?.votedSongs?.length > 0 ? [...user?.votedSongs] : [];
                user.votedSongs = [...tempvotedSongs, newVote._id];
                await user.save();
                req.io.emit("voteUpdate", { trackId: song.trackId, votes: song.votes });
                console.log("Emitted voteUpdate event");
                
                return res.status(200).json({ message: "Song voted successfully", hasVoted: true, votes: tempVotes });
            }
            return res.status(200).json({ message: "Song not voted", hasVoted: false });
        }
    } catch (error) {
        console.log(error);
        
        res.status(500).json({ message: "Error while fetching vote details", error });
    }
};

// Get all votes for a song
const getSongVotes = async (req, res) => {
    const { trackId } = req.params;
    try {
        if(!trackId) {
            return res.status(400).json({ message: "Missing required fields" });
        } 
        const song = await Song.findOne({ trackId: trackId });
        if(!song) {
            return res.status(201).json({ message: "Song not voted", votes: [] });
        }
        const Lvotes = await Vote.find({ songId: song._id, voteType: "L" });
        const Midvotes = await Vote.find({ songId: song._id, voteType: "Mid" });
        const Wvotes = await Vote.find({ songId: song._id, voteType: "W" });
        if (Lvotes || Midvotes || Wvotes) {
            return res.status(200).json({ message: "Song exists", votes: {Lvotes, Midvotes, Wvotes} });
        } else {
            return res.status(201).json({ message: "Song not voted", votes: [] });
        }
    } catch (error) {
        res.status(500).json({ message: "Error while fetching vote details", error });
    }
};

// Get most voted songs by vote type (L, Mid, W)
const getMostVotedSongs = async (req, res) => {
    const { voteType, limit = 10 } = req.query;
    
    try {
        console.log(`Fetching most voted songs for type: ${voteType}, limit: ${limit}`);
        
        if (!voteType || !['L', 'Mid', 'W'].includes(voteType)) {
            console.log("Invalid vote type provided:", voteType);
            return res.status(400).json({ message: "Invalid vote type. Must be L, Mid, or W" });
        }

        // Get a count of total songs in the database
        const totalSongs = await Song.countDocuments();
        console.log(`Total songs in database: ${totalSongs}`);
        
        // Get a count of songs with votes of the specified type
        const songsWithVotes = await Song.countDocuments({ [`votes.${voteType}`]: { $gt: 0 } });
        console.log(`Songs with ${voteType} votes: ${songsWithVotes}`);
        
        // Aggregation to find songs with the most votes of a specific type
        const songs = await Song.aggregate([
            {
                $project: {
                    trackId: 1,
                    name: 1,
                    artists: 1,
                    albumImage: 1,
                    votes: 1,
                    votesOfType: `$votes.${voteType}`,
                    totalVotes: { $sum: ['$votes.L', '$votes.Mid', '$votes.W'] }
                }
            },
            { $sort: { votesOfType: -1, totalVotes: -1 } },
            { $limit: parseInt(limit) }
        ]);

        console.log(`Aggregation returned ${songs.length} songs`);
        if (songs.length === 0) {
            console.log("No songs were found with votes");
        } else {
            console.log("Sample of first song:", JSON.stringify(songs[0]));
        }

        // Format response for frontend
        const formattedSongs = songs.map(song => ({
            id: song.trackId,
            name: song.name,
            artist: Array.isArray(song.artists) ? song.artists[0] : song.artists,
            image: song.albumImage,
            votes: song.votes
        }));

        console.log(`Returning ${formattedSongs.length} formatted songs`);
        return res.status(200).json(formattedSongs);
    } catch (error) {
        console.error("Error fetching most voted songs:", error);
        res.status(500).json({ message: "Error fetching most voted songs", error: error.message });
    }
};

// Get all users who voted for a specific song
const getSongVotersByType = async (req, res) => {
    const { trackId } = req.params;
    const { voteType } = req.query; // Extract voteType from request

    try {
        console.log(`Fetching voters for trackId: ${trackId} with voteType: ${voteType}`);

        // Find song by trackId
        const song = await Song.findOne({ trackId });
        if (!song) {
            console.log(`Song with trackId ${trackId} not found`);
            return res.status(404).json({ message: "Song not found" });
        }

        // Find votes for this song filtered by voteType
        const filter = { songId: song._id };
        if (voteType) {
            filter.voteType = voteType; // Apply voteType filter if provided
        }

        const votes = await Vote.find(filter).populate({
            path: 'userId',
            select: 'name picture' // Only fetch name and picture
        });

        console.log(`Found ${votes.length} votes for song: ${song.name}`);

        // Return voters
        const voters = votes.map(vote => ({
            id: vote.userId._id,
            name: vote.userId.name,
            picture: vote.userId.picture,
            voteType: vote.voteType,
            voteDate: vote.createdAt
        }));

        return res.status(200).json(voters);
    } catch (error) {
        console.error("Error fetching song voters:", error);
        res.status(500).json({ message: "Error fetching song voters", error: error.message });
    }
};


module.exports = { getSongData, isSongVoted, castVote, getSongVotes, getMostVotedSongs, getSongVotersByType };

const axios = require("axios");
const User = require("../models/User");
const Vote = require("../models/Vote");
require("dotenv").config();

const createUser = async (req, res) => {
    
    const { name, email, picture } = req.body;
    console.log("In createUser with name:", name, "email:", email, "picture:",picture);
    if(!name || !email || !picture) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const user = await User.findOne({ email });
        if (user) {
            return res.status(201).json({ message: "User already exists", user: user });
        }
        const newUser = await User.create({ name, email, picture });
        
        if (newUser) {
            res.status(201).json({ message: "User created successfully", user: newUser });
        } else {
            res.status(500).json({ message: "Error creating user" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error while creating user", error });
    }
};

const getUser = async (req, res) => {
    
    const { email } = req.body;
    if(!email) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const user = await User.findOne({ email });
        if (user) {
            return res.status(201).json({ message: "User already exists", user: user });
        }
        return res.status(500).json({ message: "Error fetching user" });
    } catch (error) {
        res.status(500).json({ message: "Error while fetching user", error });
    }
};

const getVotedSongs = async (req, res) => {
    const { userId } = req.params;
    console.log("In getVotedSongs with userId:", userId);
    
    if(!userId) {
        return res.status(400).json({ message: "User ID required !" });
    }
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const votedSongs = await Vote.find({ userId: userId }).populate("songId");
        
        if (votedSongs) {
            res.status(201).json({ message: "Songs fetched successfully", songs: votedSongs });
        } else {
            res.status(500).json({ message: "Error fetching songs" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error while fetching songs", error });
    }
};

// Get top users based on number of votes cast
const getTopVoters = async (req, res) => {
    const { limit = 20 } = req.query;
    
    try {
        console.log(`Fetching top voters with limit: ${limit}`);
        
        // Check total votes in the system
        const totalVotes = await Vote.countDocuments();
        console.log(`Total votes in database: ${totalVotes}`);
        
        // Check total users in the system
        const totalUsers = await User.countDocuments();
        console.log(`Total users in database: ${totalUsers}`);
        
        // First, get all users who have cast votes
        const userVoteCounts = await Vote.aggregate([
            {
                $group: {
                    _id: "$userId",
                    totalVotes: { $sum: 1 },
                    uniqueSongs: { $addToSet: "$songId" },
                    voteTypes: { $push: "$voteType" }
                }
            },
            { $sort: { totalVotes: -1 } },
            { $limit: parseInt(limit) }
        ]);

        console.log(`Vote aggregation returned ${userVoteCounts.length} users`);
        if (userVoteCounts.length === 0) {
            console.log("No users have cast any votes yet");
        } else {
            console.log("Sample of first user vote data:", 
                        JSON.stringify({
                            userId: userVoteCounts[0]._id,
                            totalVotes: userVoteCounts[0].totalVotes,
                            uniqueSongs: userVoteCounts[0].uniqueSongs.length
                        }));
        }

        // Get user details and calculate vote distribution
        const topVoters = await Promise.all(userVoteCounts.map(async (userVotes) => {
            const user = await User.findById(userVotes._id);
            if (!user) {
                console.log(`User with ID ${userVotes._id} not found in database`);
                return null;
            }

            // Calculate distribution of vote types
            const voteDistribution = {
                L: userVotes.voteTypes.filter(type => type === 'L').length,
                Mid: userVotes.voteTypes.filter(type => type === 'Mid').length,
                W: userVotes.voteTypes.filter(type => type === 'W').length
            };

            return {
                _id: user._id,
                username: user.name,
                profileImage: user.picture,
                totalVotes: userVotes.totalVotes,
                uniqueSongs: userVotes.uniqueSongs.length,
                joinedDate: user.createdAt,
                voteDistribution
            };
        }));

        // Filter out null values (in case a user was deleted)
        const filteredVoters = topVoters.filter(voter => voter !== null);
        
        console.log(`Returning ${filteredVoters.length} formatted voters`);
        if (filteredVoters.length > 0) {
            console.log("Sample first voter:", JSON.stringify({
                username: filteredVoters[0].username,
                totalVotes: filteredVoters[0].totalVotes,
                distribution: filteredVoters[0].voteDistribution
            }));
        }

        return res.status(200).json(filteredVoters);
    } catch (error) {
        console.error("Error fetching top voters:", error);
        res.status(500).json({ message: "Error fetching top voters", error: error.message });
    }
};

module.exports = { createUser, getVotedSongs, getUser, getTopVoters };

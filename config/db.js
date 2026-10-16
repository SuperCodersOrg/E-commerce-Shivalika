const mongoose = require("mongoose");
//to connect mongo to server
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log("MongoDB connected successfully");
    } catch (error) {
        throw new Error(
            `Could not connect to MongoDB. Check that MongoDB is running and MONGODB_URI in .env is correct. Details: ${error.message}`
        );
    }
};

module.exports = connectDB;
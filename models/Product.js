const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        externalId: {
            type: Number,
            required: true,
            unique: true
        },

        title: {
            type: String,
            required: true
        },

        description: String,
        category: String,
        price: Number,
        thumbnail: String,
        images: [String],
        brand: String,

        specifications: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
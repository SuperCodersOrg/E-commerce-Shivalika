const mongoose = require("mongoose");
const Product = require("../models/Product");

const getProducts = async (req, res, next) => {
    try {
        const cursor = req.query.cursor;
        const limit = 4;

        const query = {};

        if (cursor) {
            // Invalid MongoDB ID ko pehle hi reject karo
            if (!mongoose.isValidObjectId(cursor)) {
                return res.status(400).json({
                    message: "Invalid cursor"
                });
            }

            query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
        }

        // 4 display karne ke liye, 5th sirf hasMore check karne ke liye
        const products = await Product.find(query)
            .sort({ _id: 1 })
            .limit(limit + 1)
            .select("title thumbnail price category");

        const hasMore = products.length > limit;
        const resultProducts = products.slice(0, limit);

        const nextCursor = resultProducts.length
            ? resultProducts[resultProducts.length - 1]._id.toString()
            : null;

        res.json({
            products: resultProducts,
            nextCursor: hasMore ? nextCursor : null,
            hasMore
        });
    } catch (error) {
        next(error);
    }
};

const getProductDetails = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        res.render("products/detail", { product });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).send("Product not found.");
        }

        next(error);
    }
};

module.exports = {
    getProducts,
    getProductDetails
};
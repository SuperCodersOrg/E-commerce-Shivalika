const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");

const PAGE_SIZE = 3;

// Show Profile & Orders Page
const showProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            res.clearCookie("token");
            return res.redirect("/auth/login");
        }

        // Fetch first batch of orders using cursor indexing
        const orders = await Order.find({ user: user._id })
            .sort({ _id: -1 })
            .limit(PAGE_SIZE + 1);

        const hasMore = orders.length > PAGE_SIZE;
        const resultOrders = orders.slice(0, PAGE_SIZE);
        const nextCursor = resultOrders.length > 0
            ? resultOrders[resultOrders.length - 1]._id.toString()
            : null;

        const totalOrdersCount = await Order.countDocuments({ user: user._id });

        res.render("profile", {
            user,
            orders: resultOrders,
            hasMore,
            nextCursor,
            totalOrdersCount
        });
    } catch (error) {
        next(error);
    }
};

// Cursor-based API for loading more orders
const getOrdersCursor = async (req, res, next) => {
    try {
        const { cursor } = req.query;
        const query = { user: req.userId };

        if (cursor) {
            if (!mongoose.isValidObjectId(cursor)) {
                return res.status(400).json({ message: "Invalid cursor" });
            }
            query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
        }

        const orders = await Order.find(query)
            .sort({ _id: -1 })
            .limit(PAGE_SIZE + 1);

        const hasMore = orders.length > PAGE_SIZE;
        const resultOrders = orders.slice(0, PAGE_SIZE);
        const nextCursor = resultOrders.length > 0
            ? resultOrders[resultOrders.length - 1]._id.toString()
            : null;

        res.json({
            orders: resultOrders,
            hasMore,
            nextCursor
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    showProfile,
    getOrdersCursor
};

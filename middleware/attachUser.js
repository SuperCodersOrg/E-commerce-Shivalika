const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Cart = require("../models/Cart");

const attachUser = async (req, res, next) => {
    res.locals.user = null;
    res.locals.initial = null;
    res.locals.cartCount = 0;
    req.user = null;
    req.userId = null;

    const token = req.cookies?.token;

    if (!token || !process.env.JWT_SECRET) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("name email role isAdmin");
        if (user) {
            req.userId = user._id.toString();
            req.user = user;
            res.locals.user = user;
            res.locals.initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

            // Count total quantity in user's cart
            const cart = await Cart.findOne({ user: user._id }).select("items");
            if (cart && Array.isArray(cart.items)) {
             //aggreation
       const totalItems = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                res.locals.cartCount = totalItems;
            }
        } else {
            // User was removed from DB , cokkie destroy kr di
            res.clearCookie("token");
        }
    } catch (err) {
        // Token invalid or expired
        res.clearCookie("token");
    }

    next();
};

module.exports = attachUser;
//issue
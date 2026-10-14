const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
    showCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartCount
} = require("../controllers/cartController");

// Cart page (protected)
router.get("/cart", authMiddleware, showCart);

// Cart API endpoints
router.post("/api/cart/add", authMiddleware, addToCart);
router.post("/api/cart/update", authMiddleware, updateCartItem);
router.post("/api/cart/remove", authMiddleware, removeFromCart);
router.get("/api/cart/count", getCartCount);

module.exports = router;

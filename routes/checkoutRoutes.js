const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
    showCheckout,
    createCheckoutSession,
    showOrderSuccess
} = require("../controllers/checkoutController");

// Checkout page (protected)
router.get("/checkout", authMiddleware, showCheckout);
router.post("/checkout/create-session", authMiddleware, createCheckoutSession);
router.get("/checkout/success", authMiddleware, showOrderSuccess);

module.exports = router;

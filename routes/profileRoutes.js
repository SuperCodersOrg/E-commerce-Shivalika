const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
    showProfile,
    getOrdersCursor
} = require("../controllers/profileController");

router.get("/profile", authMiddleware, showProfile);
router.get("/api/orders", authMiddleware, getOrdersCursor);

module.exports = router;

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { showDashboard } = require("../controllers/dashboardController");

router.get("/", (req, res) => {
    if (req.cookies?.token && process.env.JWT_SECRET) {
        try {
            jwt.verify(req.cookies.token, process.env.JWT_SECRET);
            return res.redirect("/dashboard");
        } catch {
            // invalid or expired token
        }
    }
    res.redirect("/auth/login");
});

router.get("/dashboard", authMiddleware, showDashboard);

module.exports = router;
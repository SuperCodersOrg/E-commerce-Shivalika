const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { showDashboard } = require("../controllers/dashboardController");

router.get("/", (req, res) => {
    res.redirect("/auth/login");
});

router.get("/dashboard", authMiddleware, showDashboard);

module.exports = router;
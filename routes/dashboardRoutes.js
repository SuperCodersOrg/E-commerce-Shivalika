const express = require("express");
const router = express.Router();

const { showDashboard } = require("../controllers/dashboardController");

// Storefront / Dashboard is public for both guests and authenticated users
router.get("/", showDashboard);
router.get("/dashboard", showDashboard);

module.exports = router;
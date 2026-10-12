const express = require("express");
const router = express.Router();

const {
    showForgotPassword,
    forgotPassword,
    showResetPassword,
    resetPassword
} = require("../controllers/passwordController");

router.get("/forgot-password", showForgotPassword);
router.post("/forgot-password", forgotPassword);

router.get("/reset-password/:token", showResetPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
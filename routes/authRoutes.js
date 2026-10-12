const express = require("express");
const router = express.Router();

const {showSignup,showLogin,signup,verifyEmail,login,logout} = require("../controllers/authController");

router.get("/signup", showSignup);
router.post("/signup", signup);

router.get("/login", showLogin);
router.post("/login", login);

router.get("/verify/:token", verifyEmail);
router.post("/logout", logout);

module.exports = router;
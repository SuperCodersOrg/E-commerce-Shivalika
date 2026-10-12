
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const { sendEmail } = require("../services/emailService");

// Show signup page
const showSignup = (req, res) => {
    res.render("auth/signup", {
        error: null
    });
};

// Show login page
const showLogin = (req, res) => {
    res.render("auth/login", {
        error: null,
        message: req.query.registered
            ? "Account created. Check your email and verify your account before logging in."
            : null
    });
};

// Send verification email
const sendVerificationEmail = async (user) => {
    // Generate a new verification token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token in MongoDB
    const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(
        Date.now() + 15 * 60 * 1000
    );

    // Save the token before sending the email
    await user.save();

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    const verificationLink =
        `${baseUrl}/auth/verify/${rawToken}`;

    // Send email through Nodemailer
    await sendEmail({
        to: user.email,
        subject: "Verify your My Store account",
        html: `
            <h2>Welcome to My Store</h2>
            <p>Hello ${user.name},</p>
            <p>Please click the link below to verify your email.</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>This link expires in 15 minutes.</p>
        `
    });
};

// Signup
const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).render("auth/signup", {
                error: "All fields are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).render("auth/signup", {
                error: "Password must be at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if this email is already registered
        let user = await User.findOne({
            email: normalizedEmail
        });

        if (user && user.isEmailVerified) {
            return res.status(409).render("auth/signup", {
                error: "This email is already registered. Please log in."
            });
        }

        if (!user) {
            // Hash the password before saving
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user in MongoDB
            user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                isEmailVerified: false
            });
        }

        // User is saved even if email sending fails
        try {
            await sendVerificationEmail(user);
        } catch (emailError) {
            console.error("Verification email failed:");
            console.error("Message:", emailError.message);
            console.error("Code:", emailError.code);
            console.error("Response code:", emailError.responseCode);

            // IMPORTANT:
            // Do not delete the user from MongoDB here.
            return res.status(503).render("auth/signup", {
                error: "Your account is saved, but the verification email could not be sent. Check the email configuration and try again."
            });
        }

        return res.redirect("/auth/login?registered=1");

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).render("auth/signup", {
                error: "This email is already registered."
            });
        }

        return next(error);
    }
};

// Verify email
const verifyEmail = async (req, res, next) => {
    try {
        const hashedToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).render("auth/verify-message", {
                message: "Verification link is invalid or expired."
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.render("auth/verify-message", {
            message: "Email verified successfully. You can now log in."
        });

    } catch (error) {
        return next(error);
    }
};

// Login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            email: email?.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).render("auth/login", {
                error: "Invalid email or password.",
                message: null
            });
        }

        const passwordMatches = await bcrypt.compare(
            password || "",
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).render("auth/login", {
                error: "Invalid email or password.",
                message: null
            });
        }

        if (!user.isEmailVerified) {
            return res.status(403).render("auth/login", {
                error: "Please verify your email before logging in.",
                message: null
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString()
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 1000
        });

        return res.redirect("/dashboard");

    } catch (error) {
        return next(error);
    }
};

// Logout
const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    return res.redirect("/auth/login");
};

module.exports = {
    showSignup,
    showLogin,
    signup,
    verifyEmail,
    login,
    logout
};

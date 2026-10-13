const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const { sendEmail } = require("../services/emailService");

// Helper to check if user is already authenticated
const isAuthenticated = (req) => {
    if (!req.cookies?.token || !process.env.JWT_SECRET) return false;
    try {
        jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
};

// Show signup page
const showSignup = (req, res) => {
    if (isAuthenticated(req)) {
        return res.redirect("/dashboard");
    }

    res.render("auth/signup", {
        error: null
    });
};

// Show login page
const showLogin = (req, res) => {
    if (isAuthenticated(req)) {
        return res.redirect("/dashboard");
    }

    res.render("auth/login", {
        error: null,
        verificationLink: null,
        message: req.query.registered
            ? "Account created. Check your email and verify your account before logging in."
            : null
    });
};

// Send verification email (or prepare verification token)
const sendVerificationEmail = async (user) => {
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(
        Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/auth/verify/${rawToken}`;

    console.log("==================================================");
    console.log(`[VERIFICATION EMAIL] User: ${user.email}`);
    console.log(`[VERIFICATION LINK] ${verificationLink}`);
    console.log("==================================================");

    await sendEmail({
        to: user.email,
        subject: "Verify your My Store account",
        html: `
            <h2>Welcome to My Store</h2>
            <p>Hello ${user.name},</p>
            <p>Please click the link below to verify your email.</p>
            <p><a href="${verificationLink}">Verify Email</a></p>
            <p>This link expires in 15 minutes.</p>
        `
    });

    return { rawToken, verificationLink };
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

        const hashedPassword = await bcrypt.hash(password, 12);

        if (!user) {
            user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                isEmailVerified: false
            });
        } else {
            // Update details if previously unverified
            user.name = name.trim();
            user.password = hashedPassword;
            await user.save();
        }

        let verificationLink = null;
        let emailSent = false;

        try {
            const emailResult = await sendVerificationEmail(user);
            verificationLink = emailResult.verificationLink;
            emailSent = true;
        } catch (emailError) {
            console.warn("Verification email could not be sent via SMTP:", emailError.message);

            // If sendEmail threw before or during, make sure token is generated and saved
            if (!user.emailVerificationToken) {
                const rawToken = crypto.randomBytes(32).toString("hex");
                user.emailVerificationToken = crypto
                    .createHash("sha256")
                    .update(rawToken)
                    .digest("hex");
                user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
                await user.save();

                const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                verificationLink = `${baseUrl}/auth/verify/${rawToken}`;
            } else {
                // Get verification link from the existing token if available
                const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                const rawToken = crypto.randomBytes(32).toString("hex");
                user.emailVerificationToken = crypto
                    .createHash("sha256")
                    .update(rawToken)
                    .digest("hex");
                user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
                await user.save();
                verificationLink = `${baseUrl}/auth/verify/${rawToken}`;
            }

            console.log(`[OFFLINE VERIFICATION LINK] ${verificationLink}`);
        }

        if (emailSent) {
            return res.redirect("/auth/login?registered=1");
        }

        // Friendly fallback when SMTP fails or is unconfigured
        return res.render("auth/verify-message", {
            title: "Account Created!",
            message: "Your account was created successfully. Email delivery is currently offline or unconfigured, so you can verify your account directly below:",
            actionLink: verificationLink,
            actionText: "Verify Account Now"
        });

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
                title: "Invalid or Expired Link",
                message: "Verification link is invalid or expired. Please sign up or log in again.",
                actionLink: "/auth/login",
                actionText: "Back to Login"
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.render("auth/verify-message", {
            title: "Email Verified!",
            message: "Email verified successfully. You can now log in.",
            actionLink: "/auth/login",
            actionText: "Proceed to Login"
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
                verificationLink: null,
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
                verificationLink: null,
                message: null
            });
        }

        if (!user.isEmailVerified) {
            // Generate a fresh verification link so user is never locked out
            const rawToken = crypto.randomBytes(32).toString("hex");
            user.emailVerificationToken = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");
            user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();

            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const verificationLink = `${baseUrl}/auth/verify/${rawToken}`;

            console.log("==================================================");
            console.log(`[UNVERIFIED LOGIN ATTEMPT] Verification link: ${verificationLink}`);
            console.log("==================================================");

            // Attempt to send email quietly
            try {
                await sendEmail({
                    to: user.email,
                    subject: "Verify your My Store account",
                    html: `
                        <h2>Welcome to My Store</h2>
                        <p>Hello ${user.name},</p>
                        <p>Please click the link below to verify your email.</p>
                        <p><a href="${verificationLink}">Verify Email</a></p>
                        <p>This link expires in 15 minutes.</p>
                    `
                });
            } catch (err) {
                console.warn("Could not dispatch verification email via SMTP:", err.message);
            }

            return res.status(403).render("auth/login", {
                error: "Please verify your email before logging in.",
                verificationLink,
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

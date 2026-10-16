const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");

const isAuthenticated = (req) => {
    if (!req.cookies?.token || !process.env.JWT_SECRET) return false;
    try {
        jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
};

const showSignup = (req, res) => {
    if (isAuthenticated(req)) {
        return res.redirect("/dashboard");
    }
    res.render("auth/signup", {
        error: null,
        redirect: req.query.redirect || null
    });
};


const showLogin = (req, res) => {
    if (isAuthenticated(req)) {
        return res.redirect("/dashboard");
    }

    res.render("auth/login", {
        error: null,
        verificationLink: null,
        redirect: req.query.redirect || null,
        message: req.query.registered? "Account created. Check your email and verify your account before logging in.": null
    });
};


const sendVerificationEmail = async (user) => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
    );
    await user.save();
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/auth/verify/${rawToken}`;
    const emailResult = await sendEmail({
        to: user.email,
        subject: "Verify your My Store account",
        html: `
            <h2>Welcome to My Store</h2>
            <p>Hello ${user.name},</p>
            <p>Please click the link below to verify your email.</p>
            <p><a href="${verificationLink}">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
        `
    });
    const emailSent = Boolean(emailResult?.success);
    return { rawToken, verificationLink, emailSent };
};


const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
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
            user.name = name.trim();
            user.password = hashedPassword;
            await user.save();
        }

        const { verificationLink, emailSent } = await sendVerificationEmail(user);
        if (emailSent) {
            return res.redirect("/auth/login?registered=1");
        }//issue
        return res.render("auth/verify-message", {
            title: "Account Created!",
            message: "Your account was created successfully. Click below to verify your email and activate your account:",
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

const verifyEmail = async (req, res, next) => {
    try {
        const token = (req.params.token || "").trim();
        if (!token) {
            return res.status(400).render("auth/verify-message", {
                title: "Invalid Verification Link",
                message: "No verification token provided. Please log in or request a new verification link.",
                actionLink: "/auth/login",
                actionText: "Back to Login"
            });
        }
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).render("auth/verify-message", {
                title: "Invalid or Expired Link",
                message: "Verification link is invalid or expired. If your account is already verified, you can proceed to login.",
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
            message: "Your email has been verified successfully. You can now log in and start shopping.",
            actionLink: "/auth/login",
            actionText: "Proceed to Login"
        });

    } catch (error) {
        return next(error);
    }
};


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
            const rawToken = crypto.randomBytes(32).toString("hex");
            user.emailVerificationToken = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");
            user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save();

            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const verificationLink = `${baseUrl}/auth/verify/${rawToken}`;
            console.log(`[UNVERIFIED LOGIN ATTEMPT] Verification link: ${verificationLink}`);
            sendEmail({
                to: user.email,
                subject: "Verify your My Store account",
                html: `
                    <h2>Welcome to My Store</h2>
                    <p>Hello ${user.name},</p>
                    <p>Please click the link below to verify your email.</p>
                    <p><a href="${verificationLink}">Verify Email</a></p>
                    <p>This link expires in 24 hours.</p>
                `
            }).catch(() => {});

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

        const redirectParam = req.body.redirect || req.query.redirect;
        const targetUrl = (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//"))
            ? redirectParam
            : "/dashboard";

        return res.redirect(targetUrl);

    } catch (error) {
        return next(error);
    }
};


const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    return res.redirect("/auth/login");
};

module.exports = {showSignup,showLogin,signup,verifyEmail,login,logout};

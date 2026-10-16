const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = require("../models/User");
const { sendEmail } = require("../services/emailService");

const showForgotPassword = (req, res) => {
    res.render("auth/forgot-password", {
        message: null, //default
        resetLink: null  //default kara ha
    });
};

const forgotPassword = async (req, res, next) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const genericMessage = //to check as email nahi jari
            "If an account exists for that email, a reset link will be sent.";

        const user = await User.findOne({ email });

        if (!user) {
            return res.render("auth/forgot-password", {
                message: genericMessage,
                resetLink: null
            });
        }
  //random token
        const rawToken = crypto.randomBytes(32).toString("hex");
   //data ko hash krna ->>>hashed token
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/auth/reset-password/${rawToken}`;

        const emailResult = await sendEmail({
            to: user.email,
            subject: "Reset your My Store password",
            html: `
                <h2>Password Reset</h2>
                <p>Click below to choose a new password.</p>
                <p><a href="${resetLink}">Reset Password</a></p>
                <p>This link expires in 15 minutes.</p>
                <p>If you did not request this, ignore this email.</p>
            `
        });
        const emailSent = Boolean(emailResult?.success);

        res.render("auth/forgot-password", {
            message: genericMessage,
            resetLink: !emailSent ? resetLink : null
        });
    } catch (error) {
        next(error);
    }
};

const showResetPassword = async (req, res) => {
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).render("auth/verify-message", {
            title: "Invalid or Expired Link",
            message: "Password reset link is invalid or expired. Please request a new one.",
            actionLink: "/auth/forgot-password",
            actionText: "Request New Link"
        });
    }

    res.render("auth/reset-password", {
        token: req.params.token,
        error: null
    });
};

const resetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;
//password mini of 8 if less then not accept
        if (!password || password.length < 8) {
            return res.status(400).render("auth/reset-password", {
                token: req.params.token,
                error: "Password must be at least 8 characters."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render("auth/reset-password", {
                token: req.params.token,
                error: "Passwords do not match."
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).render("auth/verify-message", {
                title: "Invalid or Expired Link",
                message: "Password reset link is invalid or expired. Please request a new one.",
                actionLink: "/auth/forgot-password",
                actionText: "Request New Link"
            });
        }
                            //pass hashing lib(no dirct pass store user ko bhi pata nahi hoga)
       user.password = await bcrypt.hash(password, 12);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;

        await user.save();

        res.render("auth/verify-message", {
            title: "Password Updated!",
            message: "Password changed successfully. You can now log in with your new password.",
            actionLink: "/auth/login",
            actionText: "Proceed to Login"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    showForgotPassword,
    forgotPassword,
    showResetPassword,
    resetPassword
};
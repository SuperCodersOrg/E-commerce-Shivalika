
const nodemailer = require("nodemailer");

const createTransporter = () => {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, "");
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT || 587);
    const secure = process.env.EMAIL_SECURE === "true" || (host === "smtp.gmail.com" && port === 465);

    if (!user || !pass) {
        throw new Error("EMAIL_USER and EMAIL_PASS must be set in .env.");
    }

    if (!process.env.EMAIL_HOST && host === "smtp.gmail.com" && pass.length !== 16) {
        throw new Error(
            "For Gmail, EMAIL_PASS must be a 16-character Google App Password. " +
            "If you are using another SMTP provider, set EMAIL_HOST, EMAIL_PORT, and EMAIL_SECURE manually."
        );
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });
};

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();
    const user = process.env.EMAIL_USER.trim();

    return transporter.sendMail({
        from: `"My Store" <${user}>`,
        to,
        subject,
        html
    });
};

module.exports = { sendEmail };

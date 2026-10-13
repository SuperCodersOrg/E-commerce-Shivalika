const nodemailer = require("nodemailer");
const dns = require("dns");

// Prefer IPv4 to avoid ENETUNREACH errors on Windows / ISPs
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
}

const createTransporter = () => {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, "");
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT || 587);
    const secure = process.env.EMAIL_SECURE === "true" || (host === "smtp.gmail.com" && port === 465);

    if (!user || !pass) {
        throw new Error("EMAIL_USER and EMAIL_PASS must be configured in .env.");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000
    });
};

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();
    const user = process.env.EMAIL_USER?.trim() || "no-reply@mystore.com";

    return transporter.sendMail({
        from: `"My Store" <${user}>`,
        to,
        subject,
        html
    });
};

module.exports = { sendEmail };

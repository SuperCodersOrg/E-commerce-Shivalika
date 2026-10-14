require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const connectDB = require("./config/db");
const { importProductsIfEmpty } = require("./services/productService");

const attachUser = require("./middleware/attachUser");
const errorMiddleware = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const productRoutes = require("./routes/productRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const profileRoutes = require("./routes/profileRoutes");
const { stripeWebhookHandler } = require("./controllers/checkoutController");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Stripe webhook route needs raw body parser BEFORE express.json()
app.post(
    "/api/webhook/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
);

app.use(express.urlencoded({
    extended: false,
    limit: "20kb"
}));

app.use(express.json({
    limit: "20kb"
}));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Globally attach user and cart count to req and res.locals
app.use(attachUser);

// Mount application routes
app.use("/auth", authRoutes);
app.use("/auth", passwordRoutes);
app.use("/", dashboardRoutes);
app.use("/", productRoutes);
app.use("/", cartRoutes);
app.use("/", checkoutRoutes);
app.use("/", profileRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
    const isApiRequest = (req.originalUrl && req.originalUrl.startsWith("/api/")) || 
                         (req.path && req.path.startsWith("/api/"));

    if (isApiRequest) {
        return res.status(404).json({ error: "Endpoint not found." });
    }

    res.status(404).render("auth/verify-message", {
        title: "404 - Not Found",
        message: "The page you are looking for does not exist.",
        actionLink: "/dashboard",
        actionText: "Back to Store"
    });
});

app.use(errorMiddleware);

const startServer = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing in .env");
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in .env");
        }

        await connectDB();
        try {
            await importProductsIfEmpty();
        } catch (error) {
            console.error("Product import failed:", error.message);
            console.error(
                "Server will start, but the dashboard may be empty until products are imported."
            );
        }

        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Application startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
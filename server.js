require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const connectDB = require("./config/db");
const { importProductsIfEmpty } = require("./services/productService");

const authRoutes = require("./routes/authRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const productRoutes = require("./routes/productRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({
    extended: false,
    limit: "20kb"
}));

app.use(express.json({
    limit: "20kb"
}));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/auth", passwordRoutes);
app.use("/", dashboardRoutes);
app.use("/", productRoutes);

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
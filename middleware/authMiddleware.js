const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const isApiRequest =
        (req.originalUrl && req.originalUrl.startsWith("/api/")) ||
        (req.path && req.path.startsWith("/api/")) ||
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("application/json"));

    // If attachUser already validated and set req.userId
    if (req.userId && req.user) {
        return next();
    }

    try {
        const token = req.cookies?.token;

        if (!token) {
            if (isApiRequest) {
                return res.status(401).json({
                    error: "Authentication required.",
                    loginRequired: true
                });
            }

            const redirectUrl = req.originalUrl || "/dashboard";
            return res.redirect(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;

        next();
    } catch (error) {
        res.clearCookie("token");

        if (isApiRequest) {
            return res.status(401).json({
                error: "Authentication required.",
                loginRequired: true
            });
        }

        return res.redirect("/auth/login");
    }
};

module.exports = authMiddleware;
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const isApiRequest = (req.originalUrl && req.originalUrl.startsWith("/api/")) || 
                         (req.path && req.path.startsWith("/api/"));

    try {
        const token = req.cookies?.token;

        if (!token) {
            if (isApiRequest) {
                return res.status(401).json({
                    error: "Authentication required."
                });
            }

            return res.redirect("/auth/login");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.userId;

        next();
    } catch (error) {
        res.clearCookie("token");

        if (isApiRequest) {
            return res.status(401).json({
                error: "Authentication required."
            });
        }

        return res.redirect("/auth/login");
    }
};

module.exports = authMiddleware;
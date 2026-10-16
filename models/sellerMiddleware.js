const sellerMiddleware = (req, res, next) => {
    const isApiRequest =
        (req.originalUrl && req.originalUrl.startsWith("/api/")) ||
        (req.path && req.path.startsWith("/api/")) ||
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("application/json"));

    const isSeller = req.user && (req.user.role === "seller" || req.user.isAdmin);

    if (isSeller) {
        return next();
    }

    if (isApiRequest) {
        return res.status(403).json({ error: "Seller access required." });
    }

    return res.redirect("/profile");
};

module.exports = sellerMiddleware;

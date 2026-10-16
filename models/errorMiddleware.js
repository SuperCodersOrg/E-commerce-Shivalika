const errorMiddleware = (err, req, res, next) => {
    console.error("Unhandled Error:", err);

    if (res.headersSent) {
        return next(err);
    }

    const isApiRequest = (req.originalUrl && req.originalUrl.startsWith("/api/")) || 
                         (req.path && req.path.startsWith("/api/"));

    if (isApiRequest) {
        return res.status(500).json({
            error: "Something went wrong. Please try again."
        });
    }

    res.status(500).render("auth/verify-message", {
        title: "500 - Server Error",
        message: "Something went wrong on our end. Please try again later.",
        actionLink: "/dashboard",
        actionText: "Back to Store"
    });
};

module.exports = errorMiddleware;
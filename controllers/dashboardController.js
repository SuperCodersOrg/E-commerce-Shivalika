const showDashboard = async (req, res, next) => {
    try {
        const user = req.user || null;
        const initial = user && user.name ? user.name.charAt(0).toUpperCase() : null;

        res.render("dashboard", {
            user,
            initial
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { showDashboard };
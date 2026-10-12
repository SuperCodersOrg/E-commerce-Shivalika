const User = require("../models/User");

const showDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("name email");

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/auth/login");
        }

        res.render("dashboard", {
            user,
            initial: user.name.charAt(0).toUpperCase()
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { showDashboard };
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getProducts,
    getProductDetails
} = require("../controllers/productController");

router.get("/api/products", authMiddleware, getProducts);
router.get("/products/:id", authMiddleware, getProductDetails);

module.exports = router;
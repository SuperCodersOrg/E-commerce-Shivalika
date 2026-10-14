const express = require("express");
const router = express.Router();

const {
    getProducts,
    getProductDetails
} = require("../controllers/productController");

// Public browsing routes with cursor-based pagination
router.get("/api/products", getProducts);
router.get("/products/:id", getProductDetails);

module.exports = router;
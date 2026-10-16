const mongoose = require("mongoose");
const Product = require("../models/Product");
const { getEffectivePrice, getAvailableStock } = require("../utils/pricing");

const getProducts = async (req, res, next) => {
    try {
        const cursor = req.query.cursor;//read karega cursor ko
        const limit = 8; 
        const query = {};
        if (cursor) {
            if (!mongoose.isValidObjectId(cursor)) {
                return res.status(400).json({
                    message: "Invalid cursor"
                });
            }
//_id is object unique id internally by mongodb
            query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
        }
//cursor pagination is aaplied
        const products = await Product.find(query)
            .sort({ _id: 1 })
            .limit(limit + 1)
            .select("title thumbnail price category discountPercent stock");

        const hasMore = products.length > limit;
        const resultProducts = products.slice(0, limit).map((product) => {
            const doc = product.toObject();
            doc.salePrice = getEffectivePrice(doc);
            doc.stock = Number.isFinite(getAvailableStock(doc)) ? getAvailableStock(doc) : null;
            return doc;
        });

        const nextCursor = resultProducts.length? resultProducts[resultProducts.length - 1]._id.toString(): null;
        res.json({
            products: resultProducts,
            nextCursor: hasMore ? nextCursor : null,//null-or product nhi ha
            hasMore
        });
    } catch (error) {
        next(error);
    }
};

const getProductDetails = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).render("auth/verify-message", {
                title: "Product Not Found",
                message: "The product you requested was not found or has been removed.",
                actionLink: "/dashboard",
                actionText: "Back to Products"
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("auth/verify-message", {
                title: "Product Not Found",
                message: "The product you requested was not found or has been removed.",
                actionLink: "/dashboard",
                actionText: "Back to Products"
            });
        }

        res.render("products/detail", {
            product,
            salePrice: getEffectivePrice(product),
            availableStock: getAvailableStock(product)
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).render("auth/verify-message", {
                title: "Product Not Found",
                message: "The product you requested was not found.",
                actionLink: "/dashboard",
                actionText: "Back to Products"
            });
        }

        next(error);
    }
};

module.exports = {getProducts,getProductDetails};
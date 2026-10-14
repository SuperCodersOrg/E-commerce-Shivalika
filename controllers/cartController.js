const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Helper to compute bill summary
const calculateCartTotals = (items) => {
    let subtotal = 0;
    let itemCount = 0;

    items.forEach((item) => {
        const price = Number(item.price || item.product?.price || 0);
        const qty = Number(item.quantity || 1);
        subtotal += price * qty;
        itemCount += qty;
    });

    const shippingFee = subtotal > 50 || subtotal === 0 ? 0 : 5.00;
    const tax = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + shippingFee + tax).toFixed(2));

    return {
        subtotal: Number(subtotal.toFixed(2)),
        shippingFee: Number(shippingFee.toFixed(2)),
        tax,
        totalAmount,
        itemCount
    };
};

// Show Cart Page
const showCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.userId }).populate("items.product");

        let items = [];
        if (cart && Array.isArray(cart.items)) {
            // Keep only items where product exists
            items = cart.items.filter((item) => item.product !== null);
        }

        const totals = calculateCartTotals(items);

        res.render("cart", {
            cartItems: items,
            totals,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

// Add product to cart (API)
const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

        let cart = await Cart.findOne({ user: req.userId });

        if (!cart) {
            cart = new Cart({
                user: req.userId,
                items: [
                    {
                        product: product._id,
                        quantity: qtyToAdd,
                        price: product.price || 0
                    }
                ]
            });
        } else {
            const existingItemIndex = cart.items.findIndex(
                (item) => item.product.toString() === product._id.toString()
            );

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += qtyToAdd;
                cart.items[existingItemIndex].price = product.price || 0;
            } else {
                cart.items.push({
                    product: product._id,
                    quantity: qtyToAdd,
                    price: product.price || 0
                });
            }
        }

        await cart.save();

        const totals = calculateCartTotals(cart.items);

        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.json({
                success: true,
                message: `"${product.title}" added to cart!`,
                cartCount: totals.itemCount,
                totals
            });
        }

        res.redirect("/cart");
    } catch (error) {
        next(error);
    }
};

// Update item quantity (Increase / Decrease)
const updateCartItem = async (req, res, next) => {
    try {
        const { productId, action, quantity } = req.body;

        if (!productId) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const cart = await Cart.findOne({ user: req.userId }).populate("items.product");
        if (!cart) {
            return res.status(404).json({ error: "Cart not found." });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.product._id.toString() === productId.toString() ||
                      item.product.toString() === productId.toString()
        );

        if (itemIndex === -1) {
            return res.status(404).json({ error: "Item not in cart." });
        }

        if (action === "increase") {
            cart.items[itemIndex].quantity += 1;
        } else if (action === "decrease") {
            cart.items[itemIndex].quantity -= 1;
            if (cart.items[itemIndex].quantity <= 0) {
                cart.items.splice(itemIndex, 1);
            }
        } else if (quantity !== undefined) {
            const newQty = parseInt(quantity, 10);
            if (newQty <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = newQty;
            }
        }

        await cart.save();

        const totals = calculateCartTotals(cart.items);

        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.json({
                success: true,
                cartCount: totals.itemCount,
                totals
            });
        }

        res.redirect("/cart");
    } catch (error) {
        next(error);
    }
};

// Remove item from cart
const removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const cart = await Cart.findOne({ user: req.userId });
        if (cart) {
            cart.items = cart.items.filter(
                (item) => item.product.toString() !== productId.toString()
            );
            await cart.save();
        }

        const totals = calculateCartTotals(cart ? cart.items : []);

        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.json({
                success: true,
                cartCount: totals.itemCount,
                totals
            });
        }

        res.redirect("/cart");
    } catch (error) {
        next(error);
    }
};

// Get current cart count
const getCartCount = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.json({ count: 0 });
        }

        const cart = await Cart.findOne({ user: req.userId }).select("items");
        const count = cart?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
        res.json({ count });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    showCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartCount,
    calculateCartTotals
};

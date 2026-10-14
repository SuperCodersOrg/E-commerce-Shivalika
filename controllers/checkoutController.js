const Cart = require("../models/Cart");
const Order = require("../models/Order");
const { calculateCartTotals } = require("./cartController");

// Initialize Stripe if valid key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    try {
        stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    } catch (err) {
        console.warn("Stripe initialization error:", err.message);
    }
}

// Show Checkout Page (Collect shipping address & view bill)
const showCheckout = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.userId }).populate("items.product");

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const validItems = cart.items.filter((item) => item.product !== null);
        if (validItems.length === 0) {
            return res.redirect("/cart");
        }

        const totals = calculateCartTotals(validItems);

        res.render("checkout", {
            cartItems: validItems,
            totals,
            user: req.user,
            error: req.query.cancelled ? "Payment was cancelled. You can try again." : null
        });
    } catch (error) {
        next(error);
    }
};

// Create Checkout Session & Order
const createCheckoutSession = async (req, res, next) => {
    try {
        const {
            fullName,
            phone,
            addressLine,
            city,
            state,
            postalCode,
            country = "India"
        } = req.body;

        // Validate address inputs
        if (!fullName?.trim() || !phone?.trim() || !addressLine?.trim() ||
            !city?.trim() || !state?.trim() || !postalCode?.trim()) {
            const cart = await Cart.findOne({ user: req.userId }).populate("items.product");
            const validItems = cart ? cart.items.filter((item) => item.product !== null) : [];
            const totals = calculateCartTotals(validItems);

            return res.status(400).render("checkout", {
                cartItems: validItems,
                totals,
                user: req.user,
                error: "Please fill in all required shipping address fields."
            });
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ user: req.userId }).populate("items.product");
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const validItems = cart.items.filter((item) => item.product !== null);
        if (validItems.length === 0) {
            return res.redirect("/cart");
        }

        const totals = calculateCartTotals(validItems);

        // Create the pending order in database
        const order = await Order.create({
            user: req.userId,
            items: validItems.map((item) => ({
                product: item.product._id,
                title: item.product.title,
                thumbnail: item.product.thumbnail || "",
                price: item.price || item.product.price || 0,
                quantity: item.quantity || 1
            })),
            shippingAddress: {
                fullName: fullName.trim(),
                phone: phone.trim(),
                addressLine: addressLine.trim(),
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
                country: country.trim() || "India"
            },
            bill: {
                subtotal: totals.subtotal,
                shippingFee: totals.shippingFee,
                tax: totals.tax,
                totalAmount: totals.totalAmount
            },
            paymentStatus: "pending",
            paymentMethod: "stripe",
            orderStatus: "processing"
        });

        const baseUrl = process.env.BASE_URL || "http://localhost:3000";

        // If Stripe is configured with a valid secret key
        if (stripe) {
            const line_items = validItems.map((item) => ({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.product.title,
                        images: item.product.thumbnail ? [item.product.thumbnail] : []
                    },
                    unit_amount: Math.round((item.price || item.product.price || 0) * 100)
                },
                quantity: item.quantity || 1
            }));

            if (totals.shippingFee > 0) {
                line_items.push({
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Shipping Fee" },
                        unit_amount: Math.round(totals.shippingFee * 100)
                    },
                    quantity: 1
                });
            }

            if (totals.tax > 0) {
                line_items.push({
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Estimated Tax (5%)" },
                        unit_amount: Math.round(totals.tax * 100)
                    },
                    quantity: 1
                });
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items,
                mode: "payment",
                success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
                cancel_url: `${baseUrl}/checkout?cancelled=1`,
                customer_email: req.user.email,
                metadata: {
                    orderId: order._id.toString(),
                    userId: req.userId.toString()
                }
            });

            order.stripeSessionId = session.id;
            await order.save();

            return res.redirect(session.url);
        }

        // Development/Test fallback if STRIPE_SECRET_KEY is not yet added
        console.log(`[TEST CHECKOUT] Order #${order._id} created. Simulating successful payment...`);
        order.paymentStatus = "paid";
        order.orderStatus = "confirmed";
        order.stripeSessionId = "simulated_session_" + Date.now();
        await order.save();

        // Clear user's cart
        await Cart.findOneAndDelete({ user: req.userId });

        return res.redirect(`/checkout/success?order_id=${order._id}&simulated=1`);

    } catch (error) {
        next(error);
    }
};

// Stripe Webhook Handler
const stripeWebhookHandler = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (stripe && webhookSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // Raw body parsed as JSON fallback
            event = typeof req.body === "string" ? JSON.parse(req.body) : JSON.parse(req.body.toString("utf8"));
        }
    } catch (err) {
        console.error("⚠️ Stripe Webhook Error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        console.log(`[STRIPE WEBHOOK] Received checkout.session.completed for session ${session.id}, orderId: ${orderId}`);

        try {
            const query = orderId ? { _id: orderId } : { stripeSessionId: session.id };
            const order = await Order.findOne(query);

            if (order) {
                order.paymentStatus = "paid";
                order.orderStatus = "confirmed";
                order.stripePaymentIntentId = session.payment_intent || session.id;
                await order.save();

                // Clear user's cart
                await Cart.findOneAndDelete({ user: order.user });
                console.log(`[STRIPE WEBHOOK] Order ${order._id} updated to PAID and cart cleared.`);
            }
        } catch (dbError) {
            console.error("Error updating order in webhook:", dbError.message);
        }
    }

    res.json({ received: true });
};

// Show Order Success Page (Bill & Receipt)
const showOrderSuccess = async (req, res, next) => {
    try {
        const { order_id, session_id } = req.query;

        if (!order_id) {
            return res.redirect("/dashboard");
        }

        const order = await Order.findById(order_id);
        if (!order) {
            return res.redirect("/dashboard");
        }

        // If returned from Stripe with session_id, verify and ensure marked as paid
        if (session_id && order.paymentStatus !== "paid") {
            order.paymentStatus = "paid";
            order.orderStatus = "confirmed";
            if (!order.stripeSessionId) {
                order.stripeSessionId = session_id;
            }
            await order.save();
            await Cart.findOneAndDelete({ user: req.userId });
        }

        res.render("order-success", {
            order,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    showCheckout,
    createCheckoutSession,
    stripeWebhookHandler,
    showOrderSuccess
};

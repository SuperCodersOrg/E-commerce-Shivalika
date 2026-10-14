const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        title: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String,
            default: ""
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        addressLine: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, default: "India", trim: true }
    },
    { _id: false }
);

const billSchema = new mongoose.Schema(
    {
        subtotal: { type: Number, required: true },
        shippingFee: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        items: [orderItemSchema],
        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },
        bill: {
            type: billSchema,
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
            index: true
        },
        paymentMethod: {
            type: String,
            default: "stripe"
        },
        stripeSessionId: {
            type: String,
            index: true
        },
        stripePaymentIntentId: {
            type: String
        },
        orderStatus: {
            type: String,
            enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
            default: "processing"
        }
    },
    { timestamps: true }
);

// Compound index for cursor-based pagination per user
orderSchema.index({ user: 1, _id: -1 });

module.exports = mongoose.model("Order", orderSchema);

const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "supplier",
        required: true,
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        size: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        pricePerUnit: {
            type: Number,
            required: true,
            min: 0,
        },
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    invoiceDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["активна", "скасована", "виконана"],
        default: "активна",
    },
    notes: {
        type: String,
        required: false,
    },
    createdBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        name: { type: String, required: true }
    },
    changesHistory: [{
        changedAt: { type: Date, default: Date.now },
        changedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
            name: { type: String, required: true }
        },
        changes: { type: Object }
    }]
}, { minimize: false });

const invoiceModel = mongoose.models.invoice || mongoose.model("invoice", invoiceSchema);

module.exports = invoiceModel;
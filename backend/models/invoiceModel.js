import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
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
        enum: ["active", "canceled"],
        default: "active",
    },
    notes: {
        type: String,
        required: false,
    },
    // createdBy: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "employee",
    //     required: true,
    // },
    // updatedBy: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "employee",
    // },
    updatedAt: {
        type: Date,
    },
}, { minimize: false });

const invoiceModel = mongoose.models.invoice || mongoose.model("invoice", invoiceSchema);

export default invoiceModel;
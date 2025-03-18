import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: "Нове замовлення" },
    date: { type: Date, default: Date.now },
    payment: { type: Boolean, default: false },

    deliveryMethod: {
        type: String,
        required: true,
        enum: ["Нова Пошта", "Укрпошта", "Самовивіз"]
    },

    deliveryDetails: {
        region: { type: String },
        city: { type: String },
        postalCode: { type: String },
        street: { type: String },
        houseNumber: { type: String },
        departmentNumber: { type: String }, // Відділення Нової Пошти або номер поштомату
    },

}, { minimize: false });

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);
export default orderModel;
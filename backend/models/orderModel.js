import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    userId: { type: String, required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        size: { type: String, required: true },
        image: { type: String, required: true },
        quantity: { type: Number, required: true }
    }],
    amount: { type: Number, required: true },
    status: { type: String, default: "Нове замовлення" },
    date: { type: Date, default: Date.now },
    payment: { type: Boolean, default: false },
    comment: { type: String },

    deliveryMethod: {
        type: String,
        required: true,
        enum: ["Нова Пошта", "Укрпошта", "Самовивіз"]
    },

    deliveryDetails: {
        firstName: { type: String, required: true },
        secondName: { type: String, required: true },
        middleName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
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
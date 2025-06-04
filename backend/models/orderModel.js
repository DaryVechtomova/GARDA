const mongoose = require("mongoose");

const editHistoryItemSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    editedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        name: { type: String, required: true }
    },
    reason: String,
    type: { type: String, enum: ['order_edit', 'status_change'], required: true }
}, { discriminatorKey: 'type', _id: false });

const orderEditSchema = new mongoose.Schema({
    changes: {
        items: [{
            productId: { type: mongoose.Schema.Types.ObjectId },
            name: String,
            size: String,
            action: { type: String, enum: ['added', 'removed', 'updated', 'quantity_changed'] },
            quantity: Number,
            oldQuantity: Number,
            newQuantity: Number
        }],
        amountChanged: Boolean,
        oldAmount: Number,
        newAmount: Number
    }
});

const statusChangeSchema = new mongoose.Schema({
    oldStatus: { type: String, required: true },
    newStatus: { type: String, required: true }
});

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
        quantity: { type: Number, required: true },
        removed: { type: Boolean, default: false }
    }],
    amount: { type: Number, required: true },
    status: { type: String, default: "Нове замовлення" },
    cancellationReason: { type: String },
    date: { type: Date, default: Date.now },
    paymentMethod: { 
    type: String, 
    required: true, 
    enum: ['payNow', 'payOnDelivery'] // Обмежуємо можливі значення
}, 
    comment: { type: String },

    deliveryMethod: {
        type: String,
        required: true,
        enum: ["Нова Пошта", "Укрпошта", "Самовивіз"]
    },

    deliveryDetails: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        middleName: { type: String },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        region: { type: String },
        city: { type: String },
        postalCode: { type: String },
        street: { type: String },
        houseNumber: { type: String },
        departmentNumber: { type: String }, // Відділення Нової Пошти або номер поштомату
    },

    editHistory: [
        {
            type: editHistoryItemSchema,
            required: true
        }
    ],

}, { minimize: false });

orderSchema.path('editHistory').discriminator('order_edit', orderEditSchema);
orderSchema.path('editHistory').discriminator('status_change', statusChangeSchema);

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);
module.exports = orderModel;
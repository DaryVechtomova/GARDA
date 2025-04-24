// import orderModel from "../models/orderModel.js";
// import userModel from "../models/userModel.js";
// import productModel from "../models/productModel.js";
// import Stripe from "stripe"
const orderModel = require("../models/orderModel.js");
const userModel = require("../models/userModel.js");
const productModel = require("../models/productModel.js");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Функція для генерації унікального номера замовлення
const generateOrderNumber = () => {
    const min = 100000000000; // Найменше 12-значне число
    const max = 999999999999; // Найбільше 12-значне число
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// placing user order for frontend
const placeOrder = async (req, res) => {
    const frontend_url = "http://localhost:5173/GARDA";

    try {
        const { userId, items, amount, deliveryMethod, deliveryDetails } = req.body;

        // Перевірка наявності обов'язкових полів
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "ID користувача є обов'язковим полем"
            });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Замовлення повинно містити хоча б один товар"
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Сума замовлення повинна бути більше нуля"
            });
        }
        if (!deliveryMethod) {
            return res.status(400).json({
                success: false,
                message: "Спосіб доставки є обов'язковим полем"
            });
        }
        if (!deliveryDetails) {
            return res.status(400).json({
                success: false,
                message: "Деталі доставки є обов'язковими"
            });
        }

        // Перевірка імені та прізвища
        if (!deliveryDetails.firstName || !deliveryDetails.lastName) {
            return res.status(400).json({
                success: false,
                message: "Ім'я та прізвище є обов'язковими полями"
            });
        }

        // Перевірка email
        if (!deliveryDetails.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryDetails.email)) {
            return res.status(400).json({
                success: false,
                message: "Будь ласка, введіть коректний email"
            });
        }

        // Перевірка номера телефону
        if (!deliveryDetails.phone || !/^\+?\d{10,12}$/.test(deliveryDetails.phone)) {
            return res.status(400).json({
                success: false,
                message: "Будь ласка, введіть коректний номер телефону (наприклад, +380123456789)"
            });
        }

        // Перевірка деталей доставки в залежності від способу доставки
        if (deliveryMethod === "Нова Пошта") {
            if (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.departmentNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Для Нової Пошти необхідно вказати область, місто та номер відділення"
                });
            }
        } else if (deliveryMethod === "Укрпошта") {
            if (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.postalCode ||
                !deliveryDetails.street || !deliveryDetails.houseNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та номер будинку"
                });
            }
        } else if (deliveryMethod === "Самовивіз") {
            if (!["Київ", "Львів", "Харків"].includes(deliveryDetails.city)) {
                return res.status(400).json({
                    success: false,
                    message: "Самовивіз можливий тільки у Києві, Львові або Харкові"
                });
            }
        }

        // Генерація унікального номера замовлення
        let orderNumber;
        let isUnique = false;

        while (!isUnique) {
            orderNumber = generateOrderNumber(); // Генеруємо номер
            const existingOrder = await orderModel.findOne({ orderNumber }); // Перевіряємо унікальність
            if (!existingOrder) {
                isUnique = true; // Якщо номер унікальний, виходимо з циклу
            }
        }

        // Створення нового замовлення
        const newOrder = new orderModel({
            userId,
            items: items.map(item => ({
                productId: item._id, // Зберігаємо ID товару
                name: item.name,
                price: item.price,
                discount: item.discount,
                size: item.size,
                image: item.images?.[0] || null,
                quantity: item.quantity
            })),
            amount,
            deliveryMethod,
            deliveryDetails,
            orderNumber,
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        const line_items = items.map((item) => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100 * 278 // Конвертація в копійки
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: "payment",
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`
        });

        res.json({ success: true, session_url: session.url, orderNumber });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

//verify order
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success == "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Оплачено" })
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Оплата не пройшла" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

//user orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId })
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error" })
    }
}


// listing orders for admin panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" })
    }
}

const updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const editor = req.user; // Отримуємо користувача, який змінює статус

    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Замовлення не знайдено" });
        }

        // Перевірка допустимих статусів
        const allowedStatuses = [
            "Нове замовлення",
            "В обробці",
            "Передано в службу доставки",
            "Чекає на отримання",
            "Доставлено",
        ];

        // Записуємо зміну статусу в історію
        const statusHistory = {
            date: new Date(),
            editedBy: {
                userId: editor._id,
                name: editor.name || `${editor.firstName} ${editor.secondName}`.trim() || 'Адміністратор'
            },
            oldStatus: order.status,
            newStatus: status,
            type: 'status_change'
        };

        // Оновлення статусу та збереження історії
        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            {
                status: status,
                $push: { editHistory: statusHistory }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Статус замовлення оновлено",
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Помилка при оновленні статусу",
            error: error.message
        });
    }
};

const cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const editor = req.user; // Отримуємо користувача, який скасовує замовлення

    try {
        if (reason == "") {
            return res.status(400).json({ success: false, message: "Будь ласка, введіть причину скасування замовлення" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Замовлення не знайдено" });
        }

        // Check if order can be canceled
        if (order.status !== "Нове замовлення" && order.status !== "В обробці") {
            return res.status(400).json({
                success: false,
                message: "Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'"
            });
        }

        // Якщо замовлення було в обробці, повертаємо товари на склад
        if (order.status === "В обробці") {
            for (const item of order.items) {
                await productModel.findByIdAndUpdate(item.productId, {
                    $inc: { "sizes.$[elem].quantity": item.quantity }
                }, {
                    arrayFilters: [{ "elem.size": item.size }]
                });
            }
        }

        // Записуємо скасування в історію
        const cancelHistory = {
            date: new Date(),
            editedBy: {
                userId: editor._id,
                name: editor.name || `${editor.firstName} ${editor.secondName}`.trim() || 'Адміністратор'
            },
            reason: reason,
            type: 'status_change',
            oldStatus: order.status,
            newStatus: "Скасовано"
        };

        // Update order status and add cancellation reason
        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            {
                status: "Скасовано",
                cancellationReason: reason,
                $push: { editHistory: cancelHistory }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Замовлення успішно скасовано",
            data: updatedOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
    }
};

const updateOrder = async (req, res) => {
    const { id } = req.params;
    const { editReason, ...updateData } = req.body;
    const editor = req.user;

    if (!editor) {
        return res.status(400).json({
            success: false,
            message: "Не вдалося ідентифікувати користувача, який редагує"
        });
    }

    try {
        if (!editReason) {
            return res.status(400).json({
                success: false,
                message: "Будь ласка, оберіть причину редагування"
            });
        }

        const order = await orderModel.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Замовлення не знайдено"
            });
        }

        const newAmount = updateData.amount || 0;

        // Визначаємо зміни в товарах
        const itemChanges = [];
        const originalItems = order.items || [];
        const updatedItems = updateData.items || [];

        // Перевіряємо видалені товари
        originalItems.forEach(originalItem => {
            const foundInUpdated = updatedItems.find(item =>
                item.productId.toString() === originalItem.productId.toString() &&
                item.size === originalItem.size
            );

            if (!foundInUpdated || foundInUpdated.removed) {
                itemChanges.push({
                    productId: originalItem.productId,
                    name: originalItem.name,
                    size: originalItem.size,
                    action: 'removed',
                    quantity: originalItem.quantity
                });
            }
        });

        // Перевіряємо оновлені або додані товари
        updatedItems.forEach(updatedItem => {
            if (!updatedItem.removed) {
                const foundInOriginal = originalItems.find(item =>
                    item.productId.toString() === updatedItem.productId.toString() &&
                    item.size === updatedItem.size
                );

                if (foundInOriginal) {
                    if (foundInOriginal.quantity !== updatedItem.quantity) {
                        itemChanges.push({
                            productId: updatedItem.productId,
                            name: updatedItem.name,
                            size: updatedItem.size,
                            action: 'quantity_changed',
                            oldQuantity: foundInOriginal.quantity,
                            newQuantity: updatedItem.quantity
                        });
                    }
                } else {
                    itemChanges.push({
                        productId: updatedItem.productId,
                        name: updatedItem.name,
                        size: updatedItem.size,
                        action: 'added',
                        quantity: updatedItem.quantity
                    });
                }
            }
        });

        // Створюємо запис про редагування
        const editHistory = {
            date: new Date(),
            editedBy: {
                userId: editor._id,
                name: editor.name || `${editor.firstName} ${editor.secondName}`.trim() || 'Адміністратор'
            },
            reason: editReason,
            type: 'order_edit', // Додаємо тип запису
            changes: {
                items: itemChanges,
                amountChanged: order.amount !== newAmount,
                oldAmount: order.amount,
                newAmount: newAmount
            }
        };

        // Оновлюємо замовлення
        const updatedOrder = await orderModel.findByIdAndUpdate(
            id,
            {
                items: updateData.items,
                amount: newAmount,
                $push: { editHistory: editHistory },
                // status: order.status,
                // payment: order.payment,
                // deliveryMethod: order.deliveryMethod,
                // deliveryDetails: order.deliveryDetails,
                // userId: order.userId,
                // orderNumber: order.orderNumber
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Замовлення успішно оновлено",
            data: updatedOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Помилка при оновленні замовлення",
            error: error.message
        });
    }
};

const cancelOrderForUser = async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const user = req.user; // Отримуємо поточного користувача

    try {
        const order = await orderModel.findById(orderId);

        // Перевіряємо, чи існує замовлення
        if (!order) {
            return res.status(404).json({ success: false, message: "Замовлення не знайдено" });
        }

        // Перевіряємо, чи замовлення належить цьому користувачеві
        if (order.userId.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Ви не маєте прав для скасування цього замовлення"
            });
        }

        // Перевіряємо, чи можна скасувати замовлення
        if (order.status !== "Нове замовлення" && order.status !== "В обробці") {
            return res.status(400).json({
                success: false,
                message: "Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'"
            });
        }

        // Якщо замовлення було в обробці, повертаємо товари на склад
        if (order.status === "В обробці") {
            for (const item of order.items) {
                await productModel.findByIdAndUpdate(item.productId, {
                    $inc: { "sizes.$[elem].quantity": item.quantity }
                }, {
                    arrayFilters: [{ "elem.size": item.size }]
                });
            }
        }

        // Записуємо скасування в історію
        const cancelHistory = {
            date: new Date(),
            editedBy: {
                userId: user._id,
                name: user.name || `${user.firstName} ${user.lastName}`.trim() || 'Користувач'
            },
            reason: reason,
            type: 'status_change',
            oldStatus: order.status,
            newStatus: "Скасовано"
        };

        // Оновлюємо статус замовлення та додаємо причину скасування
        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            {
                status: "Скасовано",
                cancellationReason: reason,
                $push: { editHistory: cancelHistory }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Ваше замовлення успішно скасовано",
            data: updatedOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
    }
};


/**
 * Отримання статусу замовлення
 * @param {Object} req - Об'єкт запиту
 * @param {Object} res - Об'єкт відповіді
 */
const getOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const user = req.user; // Поточний користувач

    try {
        // Знаходимо замовлення за ID
        const order = await orderModel.findById(orderId).select('status userId orderNumber editHistory');

        // Перевіряємо, чи існує замовлення
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Замовлення не знайдено"
            });
        }

        // Перевіряємо, чи замовлення належить користувачу (якщо це не адмін)
        if (user.role !== 'admin' && order.userId.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Ви не маєте доступу до цього замовлення"
            });
        }

        // Формуємо відповідь з основним статусом та історією змін статусу
        const statusHistory = order.editHistory
            .filter(item => item.type === 'status_change')
            .map(item => ({
                date: item.date,
                changedBy: item.editedBy.name,
                oldStatus: item.oldStatus,
                newStatus: item.newStatus,
                reason: item.reason || null
            }));

        res.json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                currentStatus: order.status,
                statusHistory: statusHistory,
                cancellationReason: order.cancellationReason || null
            }
        });

    } catch (error) {
        console.error('Помилка при отриманні статусу замовлення:', error);
        res.status(500).json({
            success: false,
            message: "Сталася помилка при отриманні статусу замовлення"
        });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.orderId);
        if (!order) {
            return res.json({ success: false, message: "Замовлення не знайдено" });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні замовлення" });
    }
};

module.exports = {
    placeOrder,
    verifyOrder,
    userOrders,
    listOrders,
    updateOrderStatus,
    cancelOrder,
    updateOrder,
    cancelOrderForUser,
    getOrderStatus,
    getOrderDetails
};

// For default export, you can use module.exports directly:
module.exports.getOrderStatus = getOrderStatus;

// export default getOrderStatus;

// export { placeOrder, verifyOrder, userOrders, listOrders, updateOrderStatus, cancelOrder, updateOrder, cancelOrderForUser, getOrderStatus }
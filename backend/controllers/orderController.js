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
    console.log("Початок placeOrder. Тіло запиту:", req.body);

    try {
        if (!req.user || !req.user._id) {
            console.error("placeOrder: Користувач не авторизований");
            return res.status(401).json({ success: false, message: "Користувач не авторизований" });
        }
        const userId = req.user._id;
        console.log("placeOrder: userId:", userId);

        const { items, amount, deliveryMethod, deliveryDetails, paymentMethod } = req.body; // Отримуємо paymentMethod

        // --- ВАЛІДАЦІЯ ---
        if (!userId) return res.status(400).json({ success: false, message: "ID користувача є обов'язковим полем" });
        if (!items || items.length === 0) return res.status(400).json({ success: false, message: "Замовлення повинно містити хоча б один товар" });
        if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ success: false, message: "Сума замовлення повинна бути більше нуля" }); // Додав перевірку на тип
        if (!deliveryMethod) return res.status(400).json({ success: false, message: "Спосіб доставки є обов'язковим полем" });
        if (!paymentMethod) return res.status(400).json({ success: false, message: "Спосіб оплати є обов'язковим полем" }); // Додав перевірку
        if (!deliveryDetails) return res.status(400).json({ success: false, message: "Деталі доставки є обов'язковими" });
        if (!deliveryDetails.firstName || !deliveryDetails.lastName || !deliveryDetails.middleName) return res.status(400).json({ success: false, message: "Ім'я, прізвище та по-батькові є обов'язковими полями" });
        if (!deliveryDetails.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryDetails.email)) return res.status(400).json({ success: false, message: "Будь ласка, введіть коректний email" });
        if (!deliveryDetails.phone || !/^\+?\d{10,12}$/.test(deliveryDetails.phone)) return res.status(400).json({ success: false, message: "Будь ласка, введіть коректний номер телефону (наприклад, +380123456789)" });
        if (deliveryMethod === "Нова Пошта" && (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.departmentNumber)) return res.status(400).json({ success: false, message: "Для Нової Пошти необхідно вказати область, місто та номер відділення" });
        if (deliveryMethod === "Укрпошта" && (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.postalCode || !deliveryDetails.street || !deliveryDetails.houseNumber)) return res.status(400).json({ success: false, message: "Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та номер будинку" });
        if (deliveryMethod === "Самовивіз" && !["Київ", "Львів", "Харків"].includes(deliveryDetails.city)) return res.status(400).json({ success: false, message: "Самовивіз можливий тільки у Києві, Львові або Харкові" });

        console.log("placeOrder: Валідація пройдена. items:", JSON.stringify(items, null, 2));
        console.log("placeOrder: amount:", amount, "deliveryMethod:", deliveryMethod, "paymentMethod:", paymentMethod);

        // --- ГЕНЕРАЦІЯ НОМЕРА ЗАМОВЛЕННЯ ---
        let orderNumber;
        let isUnique = false;
        while (!isUnique) {
            orderNumber = generateOrderNumber();
            const existingOrder = await orderModel.findOne({ orderNumber });
            if (!existingOrder) isUnique = true;
        }
        console.log("placeOrder: Згенеровано orderNumber (після циклу):", orderNumber);

        // --- ФОРМУВАННЯ ТОВАРІВ ДЛЯ ЗБЕРЕЖЕННЯ ---
        const itemsToSave = items.map(item => {
            if (!item || typeof item._id === 'undefined' || typeof item.name === 'undefined' || typeof item.price !== 'number' || typeof item.size === 'undefined' || typeof item.quantity !== 'number') {
                console.error("Неповні або некоректні дані для товару в замовленні:", item);
                return null;
            }
            return {
                productId: item._id,
                name: item.name,
                price: item.price, // Оригінальна ціна за одиницю
                discount: item.discount || 0,
                size: item.size,
                image: item.image || null,
                quantity: item.quantity
            };
        }).filter(item => item !== null);

        if (itemsToSave.length === 0) { // Якщо після фільтрації не залишилося товарів
            console.error("placeOrder: Немає валідних товарів для збереження в замовленні.");
            return res.status(400).json({ success: false, message: "Немає товарів для оформлення замовлення." });
        }
        if (itemsToSave.length !== items.length) {
            console.warn("placeOrder: Деякі товари були відфільтровані через неповні/некоректні дані.");
        }
        console.log("placeOrder: Дані для збереження itemsToSave:", JSON.stringify(itemsToSave, null, 2));

        // --- СТВОРЕННЯ ОБ'ЄКТА ЗАМОВЛЕННЯ ДЛЯ БАЗИ ДАНИХ ---
        const newOrderData = {
            userId,
            items: itemsToSave,
            amount, // Це загальна сума вже зі знижками, розрахована на фронтенді
            payment: false, // <--- ЗМІНЕНО: payment завжди false при створенні, оновлюється після оплати
            paymentMethod: paymentMethod,
            deliveryMethod,
            deliveryDetails,
            orderNumber,
            // comment: deliveryDetails.comment || "" // Якщо коментар передається в deliveryDetails, або окремо
        };
        // Якщо коментар передається окремо в req.body, а не в deliveryDetails:
        if (req.body.comment) { // Або deliveryDetails.comment, якщо він там
            newOrderData.comment = req.body.comment; // Або deliveryDetails.comment
        }

        console.log("placeOrder: Об'єкт newOrderData перед створенням моделі:", JSON.stringify(newOrderData, null, 2));

        const newOrder = new orderModel(newOrderData);
        await newOrder.save();
        console.log("placeOrder: Замовлення збережено. ID:", newOrder._id);

        // --- ОЧИЩЕННЯ КОШИКА КОРИСТУВАЧА ---
        // Розглянь можливість робити це після успішної оплати/підтвердження для "payNow"
        await userModel.findByIdAndUpdate(userId, { cartData: {} });
        console.log("placeOrder: Кошик користувача очищено.");

        // --- ОБРОБКА ОПЛАТИ ---
        if (paymentMethod === "payNow") {
            const line_items = itemsToSave.map((item) => {
                let priceAfterDiscount = item.price;
                if (item.discount && item.discount > 0 && item.discount < 100) {
                    priceAfterDiscount = item.price * (1 - item.discount / 100);
                } else if (item.discount && item.discount >= 100) {
                    priceAfterDiscount = 0;
                }
                if (priceAfterDiscount < 0) priceAfterDiscount = 0;

                return {
                    price_data: {
                        currency: "uah",
                        product_data: { name: `${item.name} (Розмір: ${item.size})` }, // Додав розмір до назви для Stripe
                        unit_amount: Math.round(priceAfterDiscount * 100)
                    },
                    quantity: item.quantity
                };
            }); // .filter(item => item !== null) тут вже не потрібен, бо itemsToSave вже відфільтровані

            console.log("placeOrder: line_items для Stripe:", JSON.stringify(line_items, null, 2));

            if (line_items.length === 0) { // Це може статися, якщо всі товари безкоштовні
                console.warn("placeOrder: Немає товарів для оплати через Stripe (можливо, всі безкоштовні).");
                // Якщо оплата не потрібна, але користувач обрав "Оплатити зараз" для безкоштовного замовлення
                await orderModel.findByIdAndUpdate(newOrder._id, { payment: true, status: "Оплачено" }); // Позначаємо як оплачене
                return res.json({
                    success: true,
                    message: "Замовлення оформлено, оплата не потрібна.",
                    orderId: newOrder._id,
                    orderNumber,
                    paymentRequired: false, // Оплата не потрібна
                    session_url: null
                });
            }

            try {
                const session = await stripe.checkout.sessions.create({
                    line_items: line_items,
                    mode: "payment",
                    success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
                    cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
                    client_reference_id: newOrder._id.toString(), // Для зв'язку сесії з замовленням
                    metadata: { // Додаткова інформація, якщо потрібно
                        order_id: newOrder._id.toString(),
                        order_number: newOrder.orderNumber.toString()
                    }
                });
                console.log("placeOrder: Сесія Stripe створена. URL:", session.url);
                res.json({
                    success: true,
                    session_url: session.url,
                    orderNumber,
                    orderId: newOrder._id,
                    paymentRequired: true
                });
            } catch (stripeError) {
                console.error("placeOrder: Помилка створення сесії Stripe:", stripeError);
                // Важливо: замовлення вже збережено. Повідомляємо користувача.
                res.status(500).json({
                    success: true, // Замовлення збережено
                    message: "Замовлення оформлено, але виникла помилка при підготовці до онлайн оплати. Будь ласка, зв'яжіться з підтримкою.",
                    orderId: newOrder._id,
                    orderNumber,
                    paymentRequired: true, // Оплата все ще потрібна, але не вдалося створити сесію
                    session_url: null
                });
            }

        } else { // paymentMethod === "payOnDelivery"
            console.log("placeOrder: Оплата при отриманні. Сесія Stripe не створюється.");
            res.json({
                success: true,
                message: "Замовлення успішно оформлено з оплатою при отриманні.",
                orderNumber,
                orderId: newOrder._id,
                paymentRequired: false,
                session_url: null
            });
        }
    } catch (error) {
        console.error("placeOrder: КРИТИЧНА ПОМИЛКА:", error);
        console.error("placeOrder: Stack помилки:", error.stack);
        // Повертаємо помилку з більш конкретним повідомленням, якщо це помилка валідації Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: "Помилка сервера при оформленні замовлення." });
    }
};

//verify order
// const verifyOrder = async (req, res) => {
//     const { orderId, success } = req.body;
//     try {
//         if (success == "true") {
//             await orderModel.findByIdAndUpdate(orderId, { payment: true });
//             res.json({ success: true, message: "Оплачено" })
//         } else {
//             await orderModel.findByIdAndDelete(orderId);
//             res.json({ success: false, message: "Оплата не пройшла" })
//         }
//     } catch (error) {
//         console.log(error)
//         res.json({ success: false, message: "Помилка" })
//     }
// }
// orderController.js
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body; // Отримуємо orderId та success з тіла запиту
    console.log("VerifyOrder: отримано orderId:", orderId, "success:", success); // ЛОГ 1

    try {
        if (!orderId) { // Додаткова перевірка
            console.error("VerifyOrder: orderId не надано.");
            return res.status(400).json({ success: false, message: "ID замовлення не надано." });
        }

        if (success === "true" || success === true) { // Обробка і рядка, і булевого значення
            const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { payment: true, status: "Оплачено" }, { new: true }); // <--- ОСЬ ТУТ PAYMENT МАЄ СТАТИ TRUE
            if (!updatedOrder) {
                console.error("VerifyOrder: Замовлення з ID", orderId, "не знайдено для оновлення.");
                return res.status(404).json({ success: false, message: "Замовлення не знайдено." });
            }
            console.log("VerifyOrder: Замовлення", orderId, "позначено як оплачене. Новий статус:", updatedOrder.status); // ЛОГ 2
            res.json({ success: true, message: "Оплачено" });
        } else {
            // Якщо оплата не пройшла, замовлення можна видалити або змінити статус на "Скасовано" або "Оплата не вдалася"
            // Видалення може бути не найкращим варіантом, якщо ти хочеш аналізувати невдалі спроби.
            const cancelledOrder = await orderModel.findByIdAndUpdate(orderId, { status: "Оплата не вдалася" }, { new: true });
            // АБО: await orderModel.findByIdAndDelete(orderId);
            if (!cancelledOrder && success !== "true" && success !== true) { // Перевіряємо, чи не було помилки, якщо success не true
                console.warn("VerifyOrder: Замовлення з ID", orderId, "не знайдено для скасування/оновлення статусу.");
                // Якщо success не "true", але замовлення не знайдено, можливо, його вже видалено або інша помилка
            } else if (cancelledOrder) {
                console.log("VerifyOrder: Статус замовлення", orderId, "оновлено на 'Оплата не вдалася'.");
            }
            res.json({ success: false, message: "Оплата не пройшла" });
        }
    } catch (error) {
        console.error("VerifyOrder: Помилка:", error); // ЛОГ 3
        res.status(500).json({ success: false, message: "Помилка сервера при верифікації замовлення" });
    }
};

//user orders for frontend
const userOrders = async (req, res) => {
    try {
        // Краще отримувати userId з токена (якщо ви використовуєте JWT аутентифікацію)
        const userId = req.user?._id || req.body.userId;

        console.log("User ID:", userId); // Для дебагінга

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "ID користувача не надано"
            });
        }

        const orders = await orderModel.find({ userId: userId })
            .sort({ date: -1 });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({
            success: false,
            message: "Помилка при отриманні замовлень користувача"
        });
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
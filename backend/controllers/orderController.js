import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Функція для генерації унікального номера замовлення
const generateOrderNumber = () => {
    const min = 100000000000; // Найменше 12-значне число
    const max = 999999999999; // Найбільше 12-значне число
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// placing user order for frontend
const placeOrder = async (req, res) => {
    const frontend_url = "http://localhost:5173";

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
                image: item.images[0],
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
                currency: "грн",
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
    const { status } = req.body; // Отримуємо новий статус з тіла запиту

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

        // Якщо статус "Скасовано" або "Повернення", заборонити зміну
        if (order.status === "Скасовано" || order.status === "Повернення") {
            return res.status(400).json({
                success: false,
                message: "Цей статус не можна змінити",
            });
        }

        // Перевірка, чи новий статус є наступним у ланцюжку
        const currentIndex = allowedStatuses.indexOf(order.status);
        const nextStatus = allowedStatuses[currentIndex + 1];

        if (status !== nextStatus) {
            return res.status(400).json({
                success: false,
                message: `Недопустимий статус. Наступний статус повинен бути: ${nextStatus}`,
            });
        }

        // Оновлення статусу
        order.status = status;
        await order.save();

        res.json({ success: true, message: "Статус замовлення оновлено", data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Помилка при оновленні статусу" });
    }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateOrderStatus }
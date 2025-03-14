import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// placing user order for frontend
const placeOrder = async (req, res) => {

    const frontend_url = "http://localhost:5173"

    try {
        const { userId, items, amount, deliveryMethod, deliveryDetails } = req.body;

        // Перевірка наявності обов'язкових полів
        if (!userId || !items || !amount || !deliveryMethod || !deliveryDetails) {
            return res.status(400).json({
                success: false,
                message: "Будь ласка, заповніть всі обов'язкові поля"
            });
        }

        // Валідація в залежності від способу доставки
        if (deliveryMethod === "Нова Пошта") {
            if (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.departmentNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Для Нової Пошти необхідно вказати область, місто та номер відділення або поштомату"
                });
            }
        } else if (deliveryMethod === "Укрпошта") {
            if (!deliveryDetails.region || !deliveryDetails.city || !deliveryDetails.postalCode ||
                !deliveryDetails.street || !deliveryDetails.houseNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та будинок"
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

        // Створення нового замовлення
        const newOrder = new orderModel({
            userId,
            items,
            amount,
            deliveryMethod,
            deliveryDetails,
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} })
        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: "грн",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100 * 278 //треба змінити
            },
            quantity: item.quantity
        }))

        // line_items.push({
        //     price_data: {
        //         currency: "грн",
        //         product_data: {
        //             name: "Delivery Charges"
        //         },
        //         unit_amount: 2 * 100 * 278 //треба змінити
        //     },
        //     quantity: 1
        // })
        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: "payment",
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`
        })
        res.json({ success: true, session_url: session.url })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

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

export { placeOrder, verifyOrder, userOrders, listOrders }
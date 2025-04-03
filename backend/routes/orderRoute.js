import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import orderModel from "../models/orderModel.js"
import { placeOrder, verifyOrder, userOrders, listOrders, updateOrderStatus, cancelOrder, updateOrder } from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/place", authMiddleware, placeOrder)
orderRouter.post("/verify", verifyOrder)
orderRouter.post("/userorders", authMiddleware, userOrders)
orderRouter.get("/list", listOrders)
orderRouter.put("/cancel/:orderId", cancelOrder);
orderRouter.put("/update-status/:orderId", updateOrderStatus);
orderRouter.post("/edit-order/:id", updateOrder)
orderRouter.get("/edit-order/:id", async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.json({ success: false, message: "Замовлення не знайдено" });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні замовлення" });
    }
});
orderRouter.get("/details/:orderId", async (req, res) => {
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
});

export default orderRouter;
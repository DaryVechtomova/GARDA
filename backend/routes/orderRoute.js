import express from "express";
import authMiddleware from "../middleware/auth.js";
import orderModel from "../models/orderModel.js"
import { placeOrder, verifyOrder, userOrders, listOrders, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/place", authMiddleware, placeOrder)
orderRouter.post("/verify", verifyOrder)
orderRouter.post("/userorders", authMiddleware, userOrders)
orderRouter.get("/list", listOrders)
orderRouter.put("/update-status/:orderId", updateOrderStatus);
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
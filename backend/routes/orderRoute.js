const express = require("express");
const { authMiddleware, adminMiddleware, strictAdminMiddleware } = require("../middleware/auth.js");
const orderModel = require("../models/orderModel.js");
const {
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
} = require("../controllers/orderController.js");

const orderRouter = express.Router();

orderRouter.post("/place", authMiddleware, placeOrder)
orderRouter.post("/verify", verifyOrder)
orderRouter.get("/userorders", authMiddleware, userOrders)
orderRouter.get("/list", authMiddleware, adminMiddleware, listOrders)
orderRouter.put("/cancel/:orderId", authMiddleware, adminMiddleware, cancelOrder);
orderRouter.put("/update-status/:orderId", authMiddleware, adminMiddleware, updateOrderStatus);
orderRouter.post("/edit-order/:id", authMiddleware, adminMiddleware, updateOrder)
orderRouter.get("/edit-order/:id", authMiddleware, adminMiddleware, async (req, res) => {
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
orderRouter.get("/details/:orderId", authMiddleware, adminMiddleware, getOrderDetails);
orderRouter.put("/cancel-order-user/:orderId", authMiddleware, cancelOrderForUser);
orderRouter.get('/:orderId/status', authMiddleware, getOrderStatus);

module.exports = orderRouter;
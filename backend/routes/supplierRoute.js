const express = require("express");
const {
    addSupplier,
    fetchSuppliers,
    removeSupplier,
    editSupplier
} = require("../controllers/supplierController.js");
const supplierModel = require("../models/supplierModel.js");
const {
    authMiddleware,
    adminMiddleware
} = require("../middleware/auth.js");

const supplierRouter = express.Router();

supplierRouter.post("/add-supplier", authMiddleware, adminMiddleware, addSupplier)
supplierRouter.get("/list-supplier", authMiddleware, adminMiddleware, fetchSuppliers)
supplierRouter.post("/remove", authMiddleware, adminMiddleware, removeSupplier)
supplierRouter.post("/edit-supplier", authMiddleware, adminMiddleware, editSupplier)
supplierRouter.get("/edit-supplier/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const supplier = await supplierModel.findById(req.params.id);
        if (!supplier) {
            return res.json({ success: false, message: "Постачальника не знайдено" });
        }
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні даних постачальника" });
    }
});
supplierRouter.get("/details/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const supplier = await supplierModel.findById(req.params.id);
        if (!supplier) {
            return res.json({ success: false, message: "Постачальника не знайдено" });
        }
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при даних постачальника" });
    }
});

module.exports = supplierRouter;
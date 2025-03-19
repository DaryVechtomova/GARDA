import express from "express"
import { addSupplier, fetchSuppliers, removeSupplier, editSupplier } from "../controllers/supplierController.js"
import supplierModel from "../models/supplierModel.js"

const supplierRouter = express.Router();

supplierRouter.post("/add-supplier", addSupplier)
supplierRouter.get("/list-supplier", fetchSuppliers)
supplierRouter.post("/remove", removeSupplier)
supplierRouter.post("/edit-supplier", editSupplier)
supplierRouter.get("/edit-supplier/:id", async (req, res) => {
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
supplierRouter.get("/details/:id", async (req, res) => {
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

export default supplierRouter;
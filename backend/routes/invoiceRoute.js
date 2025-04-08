import express from "express"
import { addInvoice, fetchInvoices, editInvoice, getInvoiceById, completeInvoice } from "../controllers/invoiceController.js"
import invoiceModel from "../models/invoiceModel.js"
import { authMiddleware, adminMiddleware, strictAdminMiddleware } from '../middleware/auth.js';

const invoiceRouter = express.Router();

invoiceRouter.post("/add-invoice", authMiddleware, strictAdminMiddleware, addInvoice)
invoiceRouter.get("/list-invoice", authMiddleware, strictAdminMiddleware, fetchInvoices)
invoiceRouter.post("/edit-invoice", authMiddleware, strictAdminMiddleware, editInvoice)
invoiceRouter.get("/edit-invoice/:id", authMiddleware, strictAdminMiddleware, async (req, res) => {
    try {
        const invoice = await invoiceModel.findById(req.params.id);
        if (!invoice) {
            return res.json({ success: false, message: "Накладну не знайдено" });
        }
        res.json({ success: true, data: invoice });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні накладної" });
    }
});
invoiceRouter.get("/details/:id", authMiddleware, strictAdminMiddleware, getInvoiceById);
invoiceRouter.post("/complete-invoice", authMiddleware, strictAdminMiddleware, completeInvoice);

export default invoiceRouter;
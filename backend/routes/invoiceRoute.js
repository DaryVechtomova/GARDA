import express from "express"
import { addInvoice, fetchInvoices, editInvoice, getInvoiceById } from "../controllers/invoiceController.js"
import invoiceModel from "../models/invoiceModel.js"

const invoiceRouter = express.Router();

invoiceRouter.post("/add-invoice", addInvoice)
invoiceRouter.get("/list-invoice", fetchInvoices)
invoiceRouter.post("/edit-invoice", editInvoice)
invoiceRouter.get("/edit-invoice/:id", async (req, res) => {
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
invoiceRouter.get("/details/:id", async (req, res) => {
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

export default invoiceRouter;
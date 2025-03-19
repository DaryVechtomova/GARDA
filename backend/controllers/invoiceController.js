import invoiceModel from "../models/invoiceModel.js";
import productModel from "../models/productModel.js";
import supplierModel from "../models/supplierModel.js";

// Додавання нової накладної
const addInvoice = async (req, res) => {
    const {
        supplier,
        products,
        totalAmount,
        notes,
    } = req.body;

    // Перевірка обов'язкових полів
    if (!supplier) {
        return res.status(400).json({ success: false, message: "Будь ласка, оберіть постачальника" });
    }
    if (!products || products.length === 0) {
        return res.status(400).json({ success: false, message: "Будь ласка, додайте товари до накладної" });
    }
    if (!totalAmount || totalAmount < 0) {
        return res.status(400).json({ success: false, message: "Загальна сума накладної некоректна" });
    }

    // Перевірка, чи існує постачальник
    const existingSupplier = await supplierModel.findById(supplier);
    if (!existingSupplier) {
        return res.status(404).json({ success: false, message: "Постачальника не знайдено" });
    }

    // Перевірка, чи існують товари
    for (const item of products) {
        const existingProduct = await productModel.findById(item.product);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: `Товар з ID ${item.product} не знайдено` });
        }
    }

    // Створення нової накладної
    const invoice = new invoiceModel({
        supplier,
        products,
        totalAmount,
        notes,
    });

    try {
        await invoice.save();
        res.json({ success: true, message: "Накладну додано", data: invoice });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при додаванні накладної", error: error.message });
    }
};

// Отримання списку всіх накладних
const fetchInvoices = async (req, res) => {
    try {
        console.log("Hello");
        const invoices = await invoiceModel.find({})
            .populate("supplier") // Заповнює дані про постачальника
            .populate("products.product"); // Заповнює дані про товари

        res.json({ success: true, data: invoices });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при отриманні накладних", error: error.message });
    }
};

// Редагування накладної
const editInvoice = async (req, res) => {
    const {
        id,
        supplier,
        products,
        totalAmount,
        notes,
        status,
    } = req.body;

    // Перевірка, чи існує накладна
    const invoice = await invoiceModel.findById(id);
    if (!invoice) {
        return res.status(404).json({ success: false, message: "Накладну не знайдено" });
    }

    // Перевірка, чи існує постачальник
    if (supplier) {
        const existingSupplier = await supplierModel.findById(supplier);
        if (!existingSupplier) {
            return res.status(404).json({ success: false, message: "Постачальника не знайдено" });
        }
    }

    // Перевірка, чи існують товари
    if (products) {
        for (const item of products) {
            const existingProduct = await productModel.findById(item.product);
            if (!existingProduct) {
                return res.status(404).json({ success: false, message: `Товар з ID ${item.product} не знайдено` });
            }
        }
    }

    // Оновлення даних накладної
    const updateData = {
        supplier: supplier || invoice.supplier,
        products: products || invoice.products,
        totalAmount: totalAmount || invoice.totalAmount,
        notes: notes || invoice.notes,
        status: status || invoice.status,
        updatedAt: new Date(),
    };

    try {
        const updatedInvoice = await invoiceModel.findByIdAndUpdate(id, updateData, { new: true })
            .populate("supplier")
            .populate("products.product");

        res.json({ success: true, message: "Накладну оновлено", data: updatedInvoice });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при редагуванні накладної", error: error.message });
    }
};

// Отримання однієї накладної за ID
const getInvoiceById = async (req, res) => {
    const { id } = req.params;

    try {
        const invoice = await invoiceModel.findById(id)
            .populate("supplier")
            .populate("products.product");

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Накладну не знайдено" });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при отриманні накладної", error: error.message });
    }
};

export { addInvoice, fetchInvoices, editInvoice, getInvoiceById };
import invoiceModel from "../models/invoiceModel.js";
import productModel from "../models/productModel.js";
import supplierModel from "../models/supplierModel.js";

// Функція для генерації унікального номера накладної
const generateSequentialInvoiceNumber = async () => {
    // Знаходимо останню накладну
    const lastInvoice = await invoiceModel.findOne().sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
        // Витягуємо число з номеру останньої накладної
        const lastNumber = parseInt(lastInvoice.invoiceNumber.replace('INV-', ''));
        nextNumber = lastNumber + 1;
    }

    // Форматуємо номер з ведучими нулями (наприклад, INV-000001)
    return `INV-${nextNumber.toString().padStart(6, '0')}`;
};

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

    // Перевірка товарів
    for (const item of products) {
        const existingProduct = await productModel.findById(item.product);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: `Товар з ID ${item.product} не знайдено` });
        }

        const sizeExists = existingProduct.sizes.some((size) => size.size === item.size);
        if (!sizeExists) {
            return res.status(400).json({ success: false, message: `Розмір ${item.size} не знайдено для товару ${existingProduct.name}` });
        }
    }

    try {
        // Генеруємо номер накладної
        const invoiceNumber = await generateSequentialInvoiceNumber();

        const invoice = new invoiceModel({
            invoiceNumber,
            supplier,
            products,
            totalAmount,
            notes,
        });

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
    try {
        const invoice = await invoiceModel.findById(req.params.id)
            .populate("supplier")
            .populate("products.product");
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Накладна не знайдена" });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        console.error("Помилка при отриманні накладної:", error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

const completeInvoice = async (req, res) => {
    const { id } = req.body;

    try {
        // Перевірка, чи існує накладна
        const invoice = await invoiceModel.findById(id);
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Накладну не знайдено" });
        }

        // Перевірка, чи накладна вже виконана або скасована
        if (invoice.status !== "активна") {
            return res.status(400).json({
                success: false,
                message: `Накладна вже ${invoice.status === "виконана" ? "виконана" : "скасована"}`
            });
        }

        // Оновлення кількості товарів на складі
        for (const item of invoice.products) {
            const product = await productModel.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Товар з ID ${item.product} не знайдено`
                });
            }

            // Оновлення кількості для вибраного розміру
            const sizeIndex = product.sizes.findIndex(size => size.size === item.size);
            if (sizeIndex === -1) {
                return res.status(400).json({
                    success: false,
                    message: `Розмір ${item.size} не знайдено для товару ${product.name}`
                });
            }

            product.sizes[sizeIndex].quantity += item.quantity;
            await product.save();
        }

        // Оновлення статусу накладної
        invoice.status = "виконана";
        invoice.updatedAt = new Date();
        await invoice.save();

        res.json({
            success: true,
            message: "Накладу виконано та товари додано на склад",
            data: invoice
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Помилка при виконанні накладної",
            error: error.message
        });
    }
};

export { addInvoice, fetchInvoices, editInvoice, getInvoiceById, completeInvoice };
import path from "path";
import supplierModel from "../models/supplierModel.js";
import fs from "fs";

// Додавання постачальника
const addSupplier = async (req, res) => {
    const {
        companyName,
        contactPerson,
        email,
        phone,
        address,
        city,
        country,
        productType,
        status,
        notes,
    } = req.body;

    // Перевірка наявності постачальника з такою назвою компанії
    const existingSupplier = await supplierModel.findOne({ companyName });
    if (existingSupplier) {
        return res.status(400).json({ success: false, message: "Компанія з такою назвою вже існує" });
    }

    // Перевірка обов'язкових полів
    if (!companyName) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть назву компанії" });
    }
    if (!contactPerson) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть контактну особу" });
    }
    if (!email) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть email" });
    }
    if (!phone) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть телефон" });
    }
    if (!address) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть адресу" });
    }
    if (!city) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть місто" });
    }
    if (!country) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть країну" });
    }
    if (!productType || productType === "Оберіть тип продукції") {
        return res.status(400).json({ success: false, message: "Будь ласка, оберіть тип продукції" });
    }
    if (!status || status === "Оберіть статус") {
        return res.status(400).json({ success: false, message: "Будь ласка, оберіть статус" });
    }

    // Створення нового постачальника
    const supplier = new supplierModel({
        companyName,
        contactPerson,
        email,
        phone,
        address,
        city,
        country,
        productType,
        status,
        notes,
    });

    try {
        await supplier.save();
        res.json({ success: true, message: "Постачальника додано" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при додаванні постачальника" });
    }
};

// Список всіх постачальників
const fetchSuppliers = async (req, res) => {
    try {
        const supplier = await supplierModel.find({});
        res.json({ success: true, data: supplier })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" });
    }
};

// Видалення постачальника
const removeSupplier = async (req, res) => {
    try {
        const supplier = await supplierModel.findById(req.body.id);

        if (!supplier) {
            return res.status(404).json({ success: false, message: "Постачальника не знайдено" });
        }

        // Видаляємо постачальника з бази даних
        await supplierModel.findByIdAndDelete(req.body.id);
        res.json({ success: true, message: "Постачальника видалено" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при видаленні постачальника" });
    }
};

// Редагування постачальника
const editSupplier = async (req, res) => {
    const {
        id,
        companyName,
        contactPerson,
        email,
        phone,
        address,
        city,
        country,
        productType,
        status,
        notes,
    } = req.body;

    const existingSupplier = await supplierModel.findOne({ companyName, _id: { $ne: id } });
    if (existingSupplier) {
        return res.status(400).json({ success: false, message: "Компанія з такою назвою вже існує" });
    }

    // Перевірка обов'язкових полів
    if (!companyName) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть назву компанії" });
    }
    if (!contactPerson) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть контактну особу" });
    }
    if (!email) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть email" });
    }
    if (!phone) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть телефон" });
    }
    if (!address) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть адресу" });
    }
    if (!city) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть місто" });
    }
    if (!country) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть країну" });
    }

    // Отримуємо поточного постачальника
    const supplier = await supplierModel.findById(id);
    if (!supplier) {
        return res.status(404).json({ success: false, message: "Постачальника не знайдено" });
    }

    // Якщо статус змінився на "завершений", встановлюємо cooperationEndDate
    if (status === "завершений" && supplier.status !== "завершений") {
        supplier.cooperationEndDate = new Date();
    }

    if (status === "активний" && supplier.status !== "завершений") {
        supplier.cooperationEndDate = "";
    }

    if (status === "призупинений" && supplier.status === "завершений") {
        supplier.cooperationEndDate = "";
    }

    const updateData = {
        companyName,
        contactPerson,
        email,
        phone,
        address,
        city,
        country,
        productType,
        status,
        notes,
        cooperationEndDate: supplier.cooperationEndDate,
    };
    try {
        const updatedSupplier = await supplierModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedSupplier) {
            return res.status(404).json({ success: false, message: "Постачальника не знайдено" });
        }

        res.json({ success: true, message: "Постачальника оновлено", data: updatedSupplier });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при редагуванні постачальника", error: error.message });
    }
};

export { addSupplier, fetchSuppliers, removeSupplier, editSupplier }
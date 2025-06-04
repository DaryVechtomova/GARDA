const mongoose = require('mongoose');
const { syncBuiltinESMExports } = require("module");
const productModel = require("../models/productModel.js");
const invoiceModel = require("../models/invoiceModel.js");
const orderModel = require("../models/orderModel.js");
const fs = require("fs");

const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

// Визначаємо ім'я папки завантажень
// ПЕРЕВІРКА ТЕСТОВОГО СЕРЕДОВИЩА: process.env.NODE_ENV часто встановлюється Jest на 'test'
const UPLOAD_FOLDER_NAME = process.env.NODE_ENV === 'test' ? 'test-uploads' : 'uploads';

// Повний абсолютний шлях до папки завантажень
const UPLOAD_DIR_ABSOLUTE = path.join(BASE_DIR, UPLOAD_FOLDER_NAME);
console.log(`[Controller] Using UPLOAD_DIR: ${UPLOAD_DIR_ABSOLUTE} (NODE_ENV: ${process.env.NODE_ENV})`); // Додано NODE_ENV для ясності

// Переконаємось, що папка існує
if (!fs.existsSync(UPLOAD_DIR_ABSOLUTE)) {
    try {
        fs.mkdirSync(UPLOAD_DIR_ABSOLUTE, { recursive: true });
    } catch (err) {
        console.error(`[Controller] Failed to create upload directory: ${UPLOAD_DIR_ABSOLUTE}`, err);
    }
}
// Функція для перевірки наявності дублікатів розмірів
const hasDuplicateSizes = (sizesArray) => {
    if (!Array.isArray(sizesArray)) return false; // Захист
    const sizeValues = sizesArray.map((size) => size.size);
    const uniqueSizes = new Set(sizeValues);
    return sizeValues.length !== uniqueSizes.size;
};

const isProductDuplicate = async (name, colors) => {
    const existingProduct = await productModel.findOne({
        name: name,
        colors: colors // Перевірка на наявність хоча б одного з кольорів у базі даних
    });
    return existingProduct;
};

// add product item
const addProduct = async (req, res) => {
    const {
        name,
        description,
        price,
        category,
        threads,
        cut,
        technique,
        fabric,
        colors,
        sizes,
    } = req.body;

    const images = req.files.map((file) => file.filename);
    let sizesData = req.body.sizes;

    // Перевірка обов'язкових полів
    if (!name) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть назву товару" });
    }
    if (!description) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть опис товару" });
    }
    if (!price || price <= 0) {
        return res.status(400).json({ success: false, message: "Ціна має бути більше 0" });
    }
    if (!category || category === "Оберіть категорію") {
        return res.status(400).json({ success: false, message: "Будь ласка, оберіть категорію товару" });
    }
    if (!colors) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть колір товару" });
    }
    if (!images || images.length === 0) {
        return res.status(400).json({ success: false, message: "Будь ласка, завантажте хоча б одне зображення товару" });
    }
    if (!Array.isArray(sizesData)) {
        if (typeof sizesData === 'string') {
            try {
                sizesData = JSON.parse(sizesData);
                if (!Array.isArray(sizesData)) { // Перевірка після парсингу
                    return res.status(400).json({ success: false, message: "Некоректний формат поля sizes після JSON парсингу" });
                }
            } catch (e) {
                return res.status(400).json({ success: false, message: "Некоректний JSON формат для поля sizes" });
            }
        } else {
            // Якщо це не масив і не рядок, що парситься, то це помилка
            console.warn("Отримано некоректний тип для 'sizes':", typeof sizesData, sizesData);
            return res.status(400).json({ success: false, message: "Некоректний формат даних для поля sizes" });
        }
    }

    // Тепер sizesData має бути масивом
    if (!sizesData || sizesData.length === 0) {
        return res.status(400).json({ success: false, message: "Необхідно вказати хоча б один розмір" });
    }

    // Валідація самих даних розмірів (чи є size і quantity)
    for (const item of sizesData) {
        if (!item.size || item.quantity === undefined || item.quantity === null || Number(item.quantity) < 0) {
            return res.status(400).json({ success: false, message: `Будь ласка, введіть хоча б один розмір` });
        }
        item.quantity = Number(item.quantity);
    }

    // Перевірка на дублікати розмірів
    if (hasDuplicateSizes(sizesData)) {
        return res.status(400).json({ success: false, message: "Розміри товару не повинні дублюватись" });
    }
    const existingProduct = await isProductDuplicate(name, colors);
    if (existingProduct) {
        return res.status(400).json({ success: false, message: "Товар з такою назвою та кольором вже існує" });
    }

    // Створення нового товару
    const product = new productModel({
        name,
        description,
        price,
        category,
        images,
        threads,
        cut,
        technique,
        fabric,
        colors,
        sizes: sizesData,
    });

    try {
        await product.save();
        res.json({ success: true, message: "Товар додано", data: product });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при додаванні товару" });
    }
};

// Отримання ціни зі знижкою
const getDiscountedPrice = (price, discount) => {
    if (discount && discount > 0) {
        return price * (1 - discount / 100);
    }
    return price;
};

// all product list
const listProduct = async (req, res) => {
    try {
        const products = await productModel.find({});
        // Додаємо поле discountedPrice для кожного товару
        const productsWithDiscount = products.map((product) => ({
            ...product.toObject(),
            discountedPrice: getDiscountedPrice(product.price, product.discount),
        }));
        res.json({ success: true, data: productsWithDiscount });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" });
    }
};

// remove product item
const removeProduct = async (req, res) => {
    try {
        const productId = req.body.id;

        // Перевіряємо, чи існують моделі перед використанням
        if (!mongoose.models.invoice) {
            console.error("Модель 'invoice' не зареєстрована!");
            // Можна повернути помилку сервера тут, якщо потрібно
            return res.status(500).json({ success: false, message: "Помилка сервера: модель накладної не знайдена." });
        }
        if (!mongoose.models.order) {
            console.error("Модель 'order' не зареєстрована!");
            // Можна повернути помилку сервера тут, якщо потрібно
            return res.status(500).json({ success: false, message: "Помилка сервера: модель замовлення не знайдена." });
        }


        const invoicesWithProduct = await invoiceModel.find({
            "products.product": productId,
            status: { $ne: "скасована" }
        });

        if (invoicesWithProduct.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Не можна видаляти товари, які є в накладних"
            });
        }

        const ordersWithProduct = await orderModel.find({
            "items.productId": productId,
            status: { $ne: "скасоване замовлення" }
        });

        if (ordersWithProduct.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Не можна видаляти товари, які є в замовленнях"
            });
        }

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Товар не знайдено"
            });
        }

        // Видаляємо всі зображення товару з папки uploads
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(image => {
                return new Promise((resolve) => {
                    const imagePath = path.join(UPLOAD_DIR_ABSOLUTE, image);

                    fs.access(imagePath, fs.constants.F_OK, (err) => {
                        if (err) {
                            console.warn(`Файл не знайдено: ${imagePath}`);
                            return resolve(false);
                        }

                        fs.unlink(imagePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error(`Помилка видалення файлу ${imagePath}:`, unlinkErr);
                                return resolve(false);
                            }
                            console.log(`Успішно видалено зображення: ${imagePath}`);
                            resolve(true);
                        });
                    });
                });
            });

            // Чекаємо завершення всіх операцій видалення
            await Promise.all(deletePromises);
        }

        // Видаляємо товар з бази даних
        await productModel.findByIdAndDelete(productId);
        res.json({ success: true, message: "Товар видалено" });
    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message.includes("Cast to ObjectId failed")
                ? "Невірний ID товару"
                : "Помилка при видаленні товару"
        });
    }
};

const editProduct = async (req, res) => {
    console.log("Дані, які прийшли:", req.body);
    const {
        id,
        name,
        description,
        price,
        category,
        threads,
        cut,
        technique,
        fabric,
        colors,
        existingImages // This should come from req.body
    } = req.body;

    // Перевірка обов'язкових полів
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Будь ласка, введіть назву товару"
        });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Будь ласка, введіть опис товару"
        });
    }
    if (!price || price <= 0) {
        return res.status(400).json({ success: false, message: "Ціна має бути більше 0" });
    }
    if (!category || category === "Оберіть категорію") {
        return res.status(400).json({ success: false, message: "Будь ласка, оберіть категорію товару" });
    }
    if (!colors || typeof colors !== 'string' || colors.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Будь ласка, введіть колір товару"
        });
    }

    const existingProduct = await isProductDuplicate(name, colors);
    if (existingProduct && existingProduct._id.toString() !== id) {
        return res.status(400).json({ success: false, message: "Товар з такою назвою та кольором вже існує" });
    }

    const updateData = {
        name,
        description,
        price,
        category,
        threads,
        cut,
        technique,
        fabric,
        colors,
    };

    try {
        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Товар не знайдено" });
        }

        let currentImages = product.images || [];
        let finalImages = [...currentImages];

        // 1. Handle new uploaded files
        const newUploadedFiles = req.files ? req.files.map((file) => file.filename) : [];

        // 2. Handle existing images that should be kept
        let keptExistingImages = [];
        if (existingImages) {
            try {
                // If existingImages is a string (JSON), parse it
                keptExistingImages = typeof existingImages === 'string'
                    ? JSON.parse(existingImages)
                    : existingImages;

                if (!Array.isArray(keptExistingImages)) {
                    keptExistingImages = [];
                }
            } catch (e) {
                console.error("Error parsing existingImages:", e);
                keptExistingImages = [];
            }

            // Determine which images to remove (present in current but not in keptExistingImages)
            const imagesToRemove = currentImages.filter((img) => !keptExistingImages.includes(img));

            // Delete the files from server
            imagesToRemove.forEach((image) => {
                const imagePath = path.join(UPLOAD_DIR_ABSOLUTE, image);
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log(`Deleted old image: ${imagePath}`);
                    }
                } catch (unlinkErr) {
                    console.error(`Error deleting file ${imagePath}:`, unlinkErr);
                }
            });

            // Combine kept existing images with new uploaded ones
            finalImages = [...keptExistingImages, ...newUploadedFiles];
        } else if (newUploadedFiles.length > 0) {
            // If no existing images specified but new files uploaded, just append them
            finalImages = [...currentImages, ...newUploadedFiles];
        }

        // Only update images if they changed
        if (JSON.stringify(finalImages) !== JSON.stringify(currentImages)) {
            updateData.images = finalImages;
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Товар не знайдено" });
        }

        res.json({
            success: true,
            message: "Товар оновлено",
            data: updatedProduct
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Помилка при редагуванні товару",
            error: error.message
        });
    }
};

// Видалення знижки з товару
const removeDiscount = async (req, res) => {
    const { id } = req.params;

    try {
        const product = await productModel.findByIdAndUpdate(
            id,
            { discount: 0 }, // Встановлюємо знижку на 0
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Товар не знайдено" });
        }

        res.json({ success: true, message: "Знижку видалено", data: product });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при видаленні знижки" });
    }
};

// Редагування знижки товару
const editDiscount = async (req, res) => {
    const { id } = req.params;
    const { discount } = req.body;

    if (isNaN(discount)) {
        return res.status(400).json({
            success: false,
            message: "Знижка повинна бути числом"
        });
    }

    // Перевірка, чи знижка в межах допустимого діапазону (0-100%)
    if (discount < 0 || discount > 100) {
        return res.status(400).json({ success: false, message: "Знижка повинна бути від 0 до 100%" });
    }

    try {
        const product = await productModel.findByIdAndUpdate(
            id,
            { discount },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Товар не знайдено" });
        }

        res.json({ success: true, message: "Знижку оновлено", data: product });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при оновленні знижки" });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.json({ success: false, message: "Товар не знайдено" });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні товару" });
    }
}

const listDiscountedProducts = async (req, res) => {
    try {
        // Знаходимо товари, де знижка більше 0
        const products = await productModel.find({ discount: { $gt: 0 } });

        // Додаємо поле discountedPrice для кожного товару
        const productsWithDiscount = products.map((product) => ({
            ...product.toObject(),
            discountedPrice: getDiscountedPrice(product.price, product.discount),
        }));

        res.json({ success: true, data: productsWithDiscount });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні товарів зі знижкою" });
    }
};

const checkProductAvailability = async (req, res) => {
    try {
        const productId = req.params.id;

        // Знаходимо товар за ID
        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Товар не знайдено"
            });
        }

        // Перевіряємо наявність товару (якщо є розміри - перевіряємо їх, інакше перевіряємо загальну наявність)
        let available = false;
        let availabilityDetails = {};

        if (product.sizes && product.sizes.length > 0) {
            // Для товарів з розмірами
            availabilityDetails.sizes = [];

            product.sizes.forEach(size => {
                if (size.quantity > 0) {
                    available = true;
                    availabilityDetails.sizes.push({
                        size: size.size,
                        available: true,
                        quantity: size.quantity
                    });
                } else {
                    availabilityDetails.sizes.push({
                        size: size.size,
                        available: false,
                        quantity: 0
                    });
                }
            });
        } else {
            // Для товарів без розмірів (просто перевіряємо загальну кількість)
            available = product.quantity > 0;
            availabilityDetails.quantity = product.quantity || 0;
        }

        res.json({
            success: true,
            data: {
                productId: product._id,
                name: product.name,
                available: available,
                details: availabilityDetails
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Помилка при перевірці наявності товару",
            error: error.message
        });
    }
};

module.exports = { addProduct, listProduct, removeProduct, editProduct, removeDiscount, editDiscount, getProductById, listDiscountedProducts, checkProductAvailability };
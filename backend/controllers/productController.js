import path from "path";
import { syncBuiltinESMExports } from "module";
import productModel from "../models/productModel.js";
import fs from "fs"

// Функція для перевірки наявності дублікатів розмірів
const hasDuplicateSizes = (sizes) => {
    const sizeValues = sizes.map((size) => size.size);
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

    const existingProduct = await isProductDuplicate(name, colors);
    if (existingProduct) {
        return res.status(400).json({ success: false, message: "Товар з такою назвою та кольором вже існує" });
    }

    // Перевірка на дублікати розмірів
    if (sizes && hasDuplicateSizes(sizes)) {
        return res.status(400).json({ success: false, message: "Дублікати розмірів не допускаються. Виправте, будь ласка." });
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
        sizes,
    });

    try {
        await product.save();
        res.json({ success: true, message: "Товар додано" });
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
        const product = await productModel.findById(req.body.id);

        // Видаляємо всі зображення товару з папки uploads
        if (product.images && product.images.length > 0) {
            product.images.forEach(image => {
                const imagePath = path.join("uploads", image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath); // Видаляємо файл
                    console.log(`Видалено зображення: ${imagePath}`);
                }
            });
        }

        // Видаляємо товар з бази даних
        await productModel.findByIdAndDelete(req.body.id);
        res.json({ success: true, message: "Товар видалено" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" });
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
    } = req.body;


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

        // Якщо нові зображення завантажено
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => file.filename);
            updateData.images = [...product.images, ...newImages];
        }

        // Обробка видалених зображень
        if (req.body.existingImages) {
            const existingImages = JSON.parse(req.body.existingImages);

            // Видалення фото, які були видалені на фронті
            const imagesToRemove = product.images.filter((image) => !existingImages.includes(image));
            imagesToRemove.forEach((image) => {
                const imagePath = path.join("uploads", image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });

            // Оновлення списку зображень
            if (req.files && req.files.length > 0) {
                updateData.images = [...existingImages, ...req.files.map((file) => file.filename)];
            } else {
                updateData.images = existingImages;
            }
        }

        const updatedProduct = await productModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Товар не знайдено" });
        }

        res.json({ success: true, message: "Товар оновлено", data: updatedProduct });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка при редагуванні товару", error: error.message });
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

export { addProduct, listProduct, removeProduct, editProduct, removeDiscount, editDiscount }
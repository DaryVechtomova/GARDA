import { syncBuiltinESMExports } from "module";
import productModel from "../models/productModel.js";
import fs from "fs"

// add product item
const addProduct = async (req, res) => {
    const images = req.files.map(file => file.filename);

    const product = new productModel({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        images: images,
        threads: req.body.threads,
        cut: req.body.cut,
        technique: req.body.technique,
        fabric: req.body.fabric,
        colors: req.body.colors,
        sizes: req.body.sizes // Додаємо розміри та кількість
    });

    try {
        await product.save();
        res.json({ success: true, message: "Товар додано" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" });
    }
};

// all product list
const listProduct = async (req, res) => {
    try {
        const products = await productModel.find({});
        res.json({ success: true, data: products })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

// remove product item
const removeProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.body.id)
        fs.unlink(`uploads/${product.image}`, () => { })

        await productModel.findByIdAndDelete(req.body.id)
        res.json({ success: true, message: "Товар видалено" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

const editProduct = async (req, res) => {
    try {
        const productId = req.body.id;

        const updateData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            threads: req.body.threads,
            cut: req.body.cut,
            technique: req.body.technique,
            fabric: req.body.fabric,
            colors: req.body.colors,
        };

        // Якщо нові зображення завантажено
        if (req.files && req.files.length > 0) {
            const product = await productModel.findById(productId);
            updateData.images = [...product.images, ...req.files.map(file => file.filename)];
        }

        // Обробка видалених зображень
        if (req.body.existingImages) {
            const existingImages = JSON.parse(req.body.existingImages);
            const product = await productModel.findById(productId);

            // Видаляємо фото, які були видалені на фронті
            const imagesToRemove = product.images.filter(image => !existingImages.includes(image));
            imagesToRemove.forEach(image => {
                fs.unlinkSync(`uploads/${image}`);
            });

            // Оновлюємо список зображень
            updateData.images = existingImages;
        }

        const updatedProduct = await productModel.findByIdAndUpdate(productId, updateData, { new: true });

        if (!updatedProduct) {
            return res.json({ success: false, message: "Товар не знайдено" });
        }

        res.json({ success: true, message: "Товар оновлено", data: updatedProduct });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при редагуванні товару", error: error.message });
    }
};

export { addProduct, listProduct, removeProduct, editProduct }
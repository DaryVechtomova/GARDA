import express from "express"
import { 
    addProduct,
    listProduct,
    removeProduct,
    editProduct,
    removeDiscount,
    editDiscount,
    getProductById,
    listDiscountedProducts,
    checkProductAvailability
} 
from "../controllers/productController.js"
import productModel from "../models/productModel.js"
import multer from "multer"
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const productRouter = express.Router();

// Image storage engine
const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        return cb(null, `${Date.now()}${file.originalname}`)

    }
})

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

productRouter.post("/add-product", authMiddleware, adminMiddleware, upload.array("images", 10), addProduct)
productRouter.get("/list-product", listProduct)
productRouter.post("/remove-product", authMiddleware, adminMiddleware, removeProduct)
productRouter.post("/edit-product", authMiddleware, adminMiddleware, upload.array("images", 10), (req, res, next) => {
    console.log("Отримані файли:", req.files); // Логування файлів
    next();
}, editProduct);

productRouter.get("/edit-product/:id", authMiddleware, adminMiddleware, async (req, res) => {
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
});

productRouter.get("/details/:id", getProductById);

productRouter.delete("/discount/remove/:id", authMiddleware, adminMiddleware, removeDiscount);
productRouter.put("/discount/edit/:id", authMiddleware, adminMiddleware, editDiscount);

// Додайте цей маршрут на сервері
productRouter.get('/search', async (req, res) => {
    try {
        const query = req.query.q; // Змінив з query на q для консистентності
        if (!query) {
            return res.status(400).json({ message: 'Query parameter is required' });
        }

        const products = await productModel.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

productRouter.get("/list-discounted-products", listDiscountedProducts)
productRouter.get("/availability/:id", checkProductAvailability);

export default productRouter;
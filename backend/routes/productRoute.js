import express from "express"
import { addProduct, listProduct, removeProduct, editProduct, removeDiscount, editDiscount } from "../controllers/productController.js"
import productModel from "../models/productModel.js"
import multer from "multer"

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

productRouter.post("/add-product", upload.array("images", 10), addProduct)
productRouter.get("/list-product", listProduct)
productRouter.post("/remove-product", removeProduct)
productRouter.post("/edit-product", upload.array("images", 10), (req, res, next) => {
    console.log("Отримані файли:", req.files); // Логування файлів
    next();
}, editProduct);
productRouter.get("/edit-product/:id", async (req, res) => {
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
productRouter.get("/details/:id", async (req, res) => {
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

productRouter.delete("/discount/remove/:id", removeDiscount);
productRouter.put("/discount/edit/:id", editDiscount);

export default productRouter;
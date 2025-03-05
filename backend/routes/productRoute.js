import express from "express"
import { addProduct, listProduct, removeProduct, editProduct } from "../controllers/productController.js"
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

const upload = multer({ storage: storage })

productRouter.post("/add", upload.array("images", 10), addProduct)
productRouter.get("/list", listProduct)
productRouter.post("/remove", removeProduct)
productRouter.post("/edit", upload.array("images", 10), editProduct);
productRouter.get("/edit/:id", async (req, res) => {
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

export default productRouter;
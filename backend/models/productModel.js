import mongoose from "mongoose";
import { type } from "os";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    threads: { type: String, required: false },
    cut: { type: String, required: false },
    technique: { type: String, required: false },
    fabric: { type: String, required: false },
    colors: { type: String, required: true },
    sizes: [{
        size: { type: String, required: false },
        quantity: { type: Number, required: false, min: 0 }
    }]
})

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
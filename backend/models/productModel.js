import mongoose from "mongoose";
import { type } from "os";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    threads: { type: String, required: true },
    cut: { type: String, required: true },
    technique: { type: String, required: true },
    fabric: { type: String, required: true },
    colors: { type: String, required: true },
    sizes: [{
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 }
    }]
})

const productModel = mongoose.model.product || mongoose.model("product", productSchema);

export default productModel;
import mongoose from "mongoose";
import { type } from "os";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    threads: { type: String },
    cut: { type: String },
    technique: { type: String },
    fabric: { type: String },
    colors: { type: String, required: true },
    sizes: [{
        size: { type: String },
        quantity: { type: Number, min: 0 }
    }]
})

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
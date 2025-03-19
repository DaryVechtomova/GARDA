import mongoose from "mongoose";
import { type } from "os";

const supplierSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true, default: "Україна" },
    cooperationStartDate: { type: Date, required: true, default: Date.now },
    cooperationEndDate: { type: Date },
    productType: { type: String, enum: ["одяг", "взуття", "аксесуари", "інше"], default: "одяг" },
    status: { type: String, enum: ["активний", "призупинений", "завершений"], default: "активний" },
    notes: { type: String, required: false }
}, { minimize: false })

const supplierModel = mongoose.models.supplier || mongoose.model("supplier", supplierSchema);

export default supplierModel;
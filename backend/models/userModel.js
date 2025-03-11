import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    secondName: { type: String, required: true },
    middleName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: true },
    region: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: String, required: true },
    apartmentNumber: { type: String, required: false },
    postalCode: { type: String, required: false },
    registrationDate: { type: Date, default: Date.now },
    cartData: { type: Object, default: {} },
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
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
    region: { type: String, required: false },
    city: { type: String, required: false },
    street: { type: String, required: false },
    houseNumber: { type: String, required: false },
    apartmentNumber: { type: String, required: false },
    postalCode: { type: String, required: false },
    registrationDate: { type: Date, default: Date.now },
    cartData: { type: Object, default: {} },
    role: { type: String, enum: ["користувач", "адміністратор", "комірник"], default: "користувач" }
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
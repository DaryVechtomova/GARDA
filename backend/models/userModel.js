// import mongoose from "mongoose";
// import { type } from "os";
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    secondName: { type: String, required: true },
    middleName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: false },
    region: { type: String, required: false },
    city: { type: String, required: false },
    street: { type: String, required: false },
    houseNumber: { type: String, required: false },
    apartmentNumber: { type: String, required: false },
    postalCode: { type: String, required: false },
    registrationDate: { type: Date, default: Date.now },
    cartData: { type: Object, default: {} },
    favourites: { type: Object, default: {} },
    // for employess
    role: { type: String, enum: ["користувач", "адміністратор", "комірник", "менеджер з продажу"], default: "користувач" },
    hireDate: { type: Date, default: Date.now }, // Дата прийому на роботу
    fireDate: { type: Date }, // Дата звільнення (null, якщо ще працює)
    isActive: { type: Boolean, default: true } // Визначає, чи співробітник ще працює
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

module.exports = userModel;
// export default userModel;
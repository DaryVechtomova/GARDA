import mongoose from 'mongoose';
import express from "express"
import { loginUser, registerUser, listEmployees, registerEmployee, editEmployee, fireEmployee, getCurrentUser, } from "../controllers/userController.js"
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import userModel from "../models/userModel.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.get("/list-employees", listEmployees);
userRouter.post("/register-employee", registerEmployee);
userRouter.post("/edit-employee", editEmployee)
userRouter.get("/edit-employee/:id", async (req, res) => {
    try {
        const employee = await userModel.findById(req.params.id);
        if (!employee) {
            return res.json({ success: false, message: "Користувача не знайдено" });
        }
        res.json({ success: true, data: employee });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при отриманні даних користувача" });
    }
});

userRouter.post("/fire-employee", fireEmployee);

userRouter.get("/details/:id", async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id);
        if (!user) {
            return res.json({ success: false, message: "Користувача не знайдено" });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка при даних користувача" });
    }
});

export default userRouter;
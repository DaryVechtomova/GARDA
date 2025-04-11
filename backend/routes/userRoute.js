import mongoose from 'mongoose';
import express from "express"
import { loginUser, registerUser, listEmployees, registerEmployee, editEmployee, fireEmployee, getCurrentUser, checkUserRole } from "../controllers/userController.js"
import { authMiddleware, adminMiddleware, strictAdminMiddleware } from "../middleware/auth.js";
import userModel from "../models/userModel.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.get("/list-employees", authMiddleware, strictAdminMiddleware, listEmployees);
userRouter.post("/register-employee", authMiddleware, strictAdminMiddleware, registerEmployee);
userRouter.post("/edit-employee", authMiddleware, strictAdminMiddleware, editEmployee)
userRouter.get("/edit-employee/:id", authMiddleware, strictAdminMiddleware, async (req, res) => {
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

userRouter.post("/fire-employee", authMiddleware, strictAdminMiddleware, fireEmployee);

userRouter.get("/details/:id", authMiddleware, strictAdminMiddleware, async (req, res) => {
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

userRouter.get('/check-role', authMiddleware, checkUserRole);

export default userRouter;
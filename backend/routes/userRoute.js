import express from "express"
import { loginUser, registerUser, listEmployees, registerEmployee } from "../controllers/userController.js"

const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/list-employees", listEmployees);
userRouter.post("/register-employee", registerEmployee);

export default userRouter;
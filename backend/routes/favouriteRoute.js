import express from "express"
import { addToFavourite, removeFromFavourite, getFavourite } from "../controllers/favouriteController.js"
import { authMiddleware } from "../middleware/auth.js";

const favouriteRouter = express.Router();

favouriteRouter.post("/add", authMiddleware, addToFavourite)
favouriteRouter.post("/remove", authMiddleware, removeFromFavourite)
favouriteRouter.post("/get", authMiddleware, getFavourite)


export default favouriteRouter;
const express = require("express");
const {
    addToFavourite,
    removeFromFavourite,
    getFavourite
} = require("../controllers/favouriteController.js");
const { authMiddleware } = require("../middleware/auth.js");

const favouriteRouter = express.Router();

favouriteRouter.post("/add", authMiddleware, addToFavourite)
favouriteRouter.post("/remove", authMiddleware, removeFromFavourite)
favouriteRouter.post("/get", authMiddleware, getFavourite)


module.exports = favouriteRouter;
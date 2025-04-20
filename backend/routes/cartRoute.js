// import express from "express"
// import { addToCart, removeFromCart, getCart } from "../controllers/cartController.js"
// import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const express = require("express");
const {
    addToCart,
    removeFromCart,
    getCart
} = require("../controllers/cartController.js");
const {
    authMiddleware,
    adminMiddleware
} = require("../middleware/auth.js");

const cartRouter = express.Router();

cartRouter.post("/add", authMiddleware, addToCart)
cartRouter.post("/remove", authMiddleware, removeFromCart)
cartRouter.post("/get", authMiddleware, getCart)

module.exports = cartRouter;
// export default cartRouter;
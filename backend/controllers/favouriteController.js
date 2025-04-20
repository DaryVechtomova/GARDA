//import userModel from "../models/userModel.js";
const userModel = require("../models/userModel.js");
// add items to user favourite
const addToFavourite = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId);
        let favourites = await userData.favourites;
        if (!favourites[req.body.itemId]) {
            favourites[req.body.itemId] = 1
        } else {
            favourites[req.body.itemId] += 1;
        }
        await userModel.findByIdAndUpdate(req.body.userId, { favourites })
        res.json({ success: true, message: "Додано до улюблених" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" })
    }
}

// remove items from user favourite
const removeFromFavourite = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId);
        let favourites = await userData.favourites;
        if (favourites[req.body.itemId] > 0) {
            favourites[req.body.itemId] -= 1;
        }
        await userModel.findByIdAndUpdate(req.body.userId, { favourites })
        res.json({ success: true, message: "Видалено з улюблених" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" })
    }
}

// fetch user favourites
const getFavourite = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId)
        let favourites = await userData.favourites;
        res.json({ success: true, favourites })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка" })
    }
}

module.exports = { addToFavourite, removeFromFavourite, getFavourite };
// export { addToFavourite, removeFromFavourite, getFavourite }
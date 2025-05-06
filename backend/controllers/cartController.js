// import userModel from "../models/userModel.js";
const userModel = require("../models/userModel.js");

// add items to user cart
const addToCart = async (req, res) => {
      try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ success: false, message: "Не авторизовано або ID користувача не знайдено в токені" });
            }
            const userId = req.user.id; // Отримуємо ID з токена
    
            let userData = await userModel.findById(userId); // Використовуємо userId з токена
            if (!userData) {
                return res.status(404).json({ success: false, message: "Користувача не знайдено" });
            }
    
            // Переконуємося, що favourites - це об'єкт
            let cartData = await userData.cartData || {};
            if (!cartData[req.body.itemId]) {
                cartData[req.body.itemId] = 1
            } else {
                cartData[req.body.itemId] += 1;
            }
            // Важливо: Mongoose може не відслідковувати зміни у вкладених об'єктах (якщо favourites - Mixed type)
            // Щоб гарантувати збереження, можна позначити шлях як змінений:
            userData.markModified('cartData');
            await userData.save(); // Або використовувати findByIdAndUpdate, але з обережністю з вкладеними полями

    
            console.log(`Додано itemId: ${req.body.itemId} до кошика користувача: ${userId}`);
            res.json({ success: true, message: "Додано до кошика", cartData: cartData }); // Повертаємо оновлені улюблені
        } catch (error) {
            console.error("Помилка в addToCart:", error);
            res.status(500).json({ success: false, message: "Помилка сервера при додаванні до кошика" });
        }
}

// remove items from user cart
const removeFromCart = async (req, res) => {
    try {
            // *** ЗМІНА: Отримуємо ID користувача з об'єкту, доданого JWT middleware ***
            if (!req.user || !req.user.id) {
                return res.status(401).json({ success: false, message: "Не авторизовано або ID користувача не знайдено в токені" });
            }
            const userId = req.user.id;
    
            let userData = await userModel.findById(userId);
            if (!userData) {
                return res.status(404).json({ success: false, message: "Користувача не знайдено" });
            }
    
            let cartData = await userData.cartData || {};
    
            if (cartData[req.body.itemId]) { // Перевіряємо, чи існує такий itemId
                if (cartData[req.body.itemId] > 1) {
                    cartData[req.body.itemId] -= 1;
                } else {
                    delete cartData[req.body.itemId]; // Видаляємо повністю, якщо був 1
                }
    
                userData.markModified('cartData');
                await userData.save();
               
    
    
                console.log(`Зменшено/видалено itemId: ${req.body.itemId} з кошика користувача: ${userId}`);
                res.json({ success: true, message: "Оновлено кошик", cartData: cartData }); // Повертаємо оновлені улюблені
            } else {
               
                res.json({ success: true, message: "Товар не знайдено в кошику", cartData:cartData }); // Можна повернути true, бо операція "видалення" неіснуючого елемента успішна
            }
        } catch (error) {
            console.error("Помилка в removeFromCart:", error);
            res.status(500).json({ success: false, message: "Помилка сервера при видаленні з кошика" });
        }
}

// fetch user cart data
const getCart = async (req, res) => {

     try {
            // *** ЗМІНА: Отримуємо ID користувача з об'єкту, доданого JWT middleware ***
            if (!req.user || !req.user.id) {
                return res.status(401).json({ success: false, message: "Не авторизовано або ID користувача не знайдено в токені" });
            }
            const userId = req.user.id;
    
            let userData = await userModel.findById(userId);
            if (!userData) {
                return res.status(404).json({ success: false, message: "Користувача не знайдено" });
            }
    
            let cartData = await userData.cartData || {}; // Повертаємо порожній об'єкт, якщо немає
            // console.log("Отримання улюблених для користувача:", userId, favourites); // Для дебагу
            res.json({ success: true, cartData: cartData});
        } catch (error) {
            console.error("Помилка в getcart:", error);
            res.status(500).json({ success: false, message: "Помилка сервера при отриманні товарів в кошику" });
        }
}

module.exports = { addToCart, removeFromCart, getCart };
// export { addToCart, removeFromCart, getCart }
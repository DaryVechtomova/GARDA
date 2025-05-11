// const userModel = require("../models/userModel.js"); // Ваш варіант
// Якщо ви використовуєте ES Modules в package.json ("type": "module") або .mjs файли:
const userModel = require("../models/userModel.js");


// add items to user favourite
const addToFavourite = async (req, res) => {
    try {
        // *** ЗМІНА: Отримуємо ID користувача з об'єкту, доданого JWT middleware ***
        // Припускаємо, що middleware додає req.user і в ньому є поле id
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Не авторизовано або ID користувача не знайдено в токені" });
        }
        const userId = req.user.id; // Отримуємо ID з токена

        let userData = await userModel.findById(userId); // Використовуємо userId з токена
        if (!userData) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        // Переконуємося, що favourites - це об'єкт
        let favourites = userData.favourites || {};
        // console.log("Поточні улюблені перед додаванням:", favourites); // Для дебагу

        if (!favourites[req.body.itemId]) {
            favourites[req.body.itemId] = 1;
        } else {
            favourites[req.body.itemId] += 1;
        }

        // Важливо: Mongoose може не відслідковувати зміни у вкладених об'єктах (якщо favourites - Mixed type)
        // Щоб гарантувати збереження, можна позначити шлях як змінений:
        userData.markModified('favourites');
        await userData.save(); // Або використовувати findByIdAndUpdate, але з обережністю з вкладеними полями

        // Або, якщо findByIdAndUpdate, то так:
        // await userModel.findByIdAndUpdate(userId, { $set: { favourites: favourites } }, { new: true });
        // $set потрібен для оновлення всього об'єкта favourites

        console.log(`Додано itemId: ${req.body.itemId} до улюблених користувача: ${userId}`);
        res.json({ success: true, message: "Додано до улюблених", favourites: favourites }); // Повертаємо оновлені улюблені
    } catch (error) {
        console.error("Помилка в addToFavourite:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при додаванні до улюблених" });
    }
};

// remove items from user favourite
const removeFromFavourite = async (req, res) => {
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

        let favourites = userData.favourites || {};
        // console.log("Поточні улюблені перед видаленням:", favourites); // Для дебагу

        if (favourites[req.body.itemId]) { // Перевіряємо, чи існує такий itemId
            if (favourites[req.body.itemId] > 1) {
                favourites[req.body.itemId] -= 1;
            } else {
                delete favourites[req.body.itemId]; // Видаляємо повністю, якщо був 1
            }

            userData.markModified('favourites');
            await userData.save();
            // Або:
            // await userModel.findByIdAndUpdate(userId, { $set: { favourites: favourites } }, { new: true });


            console.log(`Зменшено/видалено itemId: ${req.body.itemId} з улюблених користувача: ${userId}`);
            res.json({ success: true, message: "Оновлено улюблені", favourites: favourites }); // Повертаємо оновлені улюблені
        } else {
            // console.log(`Товар ${req.body.itemId} не знайдено в улюблених користувача ${userId}`);
            res.json({ success: true, message: "Товар не знайдено в улюблених", favourites: favourites }); // Можна повернути true, бо операція "видалення" неіснуючого елемента успішна
        }
    } catch (error) {
        console.error("Помилка в removeFromFavourite:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при видаленні з улюблених" });
    }
};

// fetch user favourites
const getFavourite = async (req, res) => {
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

        let favourites = userData.favourites || {}; // Повертаємо порожній об'єкт, якщо немає
        // console.log("Отримання улюблених для користувача:", userId, favourites); // Для дебагу
        res.json({ success: true, favourites: favourites });
    } catch (error) {
        console.error("Помилка в getFavourite:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при отриманні улюблених" });
    }
};

// Якщо ви використовуєте ES Modules:
//export { addToFavourite, removeFromFavourite, getFavourite };

// Якщо ви використовуєте CommonJS (як у вашому початковому коді з require):
module.exports = { addToFavourite, removeFromFavourite, getFavourite };
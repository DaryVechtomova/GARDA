const userModel = require("../models/userModel.js");

// Додавання товарів до кошика користувача
const addToCart = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Не авторизовано або ID користувача не знайдено в токені" });
        }
        const userId = req.user.id;
        // Очікуємо itemId та size з тіла запиту. quantity тепер не обов'язкове, бо логіка +1.
        const { itemId, size } = req.body; 

        if (!itemId || !size) {
            return res.status(400).json({ success: false, message: "ID товару та розмір є обов'язковими" });
        }

        let userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        // Ініціалізуємо cartData, якщо вона ще не існує (як порожній об'єкт)
        // Важливо: якщо cartData - це Mongoose Map, ініціалізація може бути іншою (new Map())
        // Але для простого об'єкта (Mixed) це підійде.
        let cartData = userData.cartData || {}; 

        // Створюємо унікальний ключ для комбінації itemId та size
        const cartItemKey = `${itemId}-${size}`;

        if (cartData[cartItemKey]) {
            // Якщо товар з таким ID та РОЗМІРОМ вже є, збільшуємо його кількість
            cartData[cartItemKey].quantity += 1;
        } else {
            // Якщо такої комбінації ID+розмір немає, додаємо новий запис
            cartData[cartItemKey] = { 
                itemId: itemId,       // Зберігаємо оригінальний itemId
                size: size,           // Зберігаємо розмір
                quantity: 1           // Початкова кількість
            };
        }
        
        userData.cartData = cartData; // Присвоюємо оновлений об'єкт
        // Позначаємо, що cartData було змінено, особливо важливо для типу Mixed
        userData.markModified('cartData'); 
        await userData.save();

        console.log(`Оновлено кошик: додано/збільшено ${cartItemKey}, користувач: ${userId}`);
        // Повертаємо весь оновлений кошик
        res.json({ success: true, message: "Кошик оновлено", cartData: userData.cartData });

    } catch (error) {
        console.error("Помилка в addToCart (бекенд):", error);
        res.status(500).json({ success: false, message: "Помилка сервера при додаванні до кошика" });
    }
};

// Видалення/зменшення товарів з кошика користувача
const removeFromCart = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Не авторизовано" });
        }
        const userId = req.user.id;
        // Тепер обов'язково очікуємо itemId ТА size
        const { itemId, size } = req.body; 

        if (!itemId || !size) {
            return res.status(400).json({ success: false, message: "ID товару та розмір є обов'язковими для видалення" });
        }

        let userData = await userModel.findById(userId);
        if (!userData || !userData.cartData) { // Перевіряємо і наявність cartData
            return res.status(404).json({ success: false, message: "Користувача або дані кошика не знайдено" });
        }

        let cartData = userData.cartData;
        const cartItemKey = `${itemId}-${size}`; // Ключ, за яким шукаємо

        if (cartData[cartItemKey]) {
            if (cartData[cartItemKey].quantity > 1) {
                // Якщо кількість більше 1, зменшуємо на 1
                cartData[cartItemKey].quantity -= 1;
            } else {
                // Якщо кількість 1 (або менше, хоча не повинно бути), видаляємо запис повністю
                delete cartData[cartItemKey]; 
            }

            userData.cartData = cartData;
            userData.markModified('cartData');
            await userData.save();

            console.log(`Зменшено/видалено ${cartItemKey} з кошика користувача: ${userId}`);
            res.json({ success: true, message: "Кошик оновлено", cartData: userData.cartData });
        } else {
            // Якщо товару з таким ключем (itemId-size) немає в кошику
            console.log(`Товар ${cartItemKey} не знайдено в кошику користувача: ${userId}`);
            res.json({ success: false, message: "Товар з вказаним розміром не знайдено в кошику", cartData: userData.cartData });
        }
    } catch (error) {
        console.error("Помилка в removeFromCart (бекенд):", error);
        res.status(500).json({ success: false, message: "Помилка сервера при видаленні з кошика" });
    }
};

// Отримання даних кошика користувача
const getCart = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Не авторизовано" });
        }
        const userId = req.user.id;

        // Вибираємо тільки поле cartData. Можна також populate, якщо itemId - це ObjectId ref до колекції Product
        // let userData = await userModel.findById(userId).select('cartData').populate('cartData.*.itemId'); // Приклад з populate
        let userData = await userModel.findById(userId).select('cartData'); 
        
        if (!userData) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        // Повертаємо cartData. Якщо вона undefined або null, повертаємо порожній об'єкт.
        // Фронтенд тепер очікує структуру: 
        // { "itemId1-sizeA": { itemId: "itemId1", size: "sizeA", quantity: X }, ... }
        res.json({ success: true, cartData: userData.cartData || {} });
    } catch (error) {
        console.error("Помилка в getCart (бекенд):", error);
        res.status(500).json({ success: false, message: "Помилка сервера при отриманні даних кошика" });
    }
};

module.exports = { addToCart, removeFromCart, getCart };
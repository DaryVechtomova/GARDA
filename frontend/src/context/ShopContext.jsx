import axios from "axios";
import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const ShopContextProvider = (props) => {
    const [cartItems, setCartItems] = useState({});
    const url = "http://localhost:4000";
    const [token, setToken] = useState("");
    const [all_products, setAll_products] = useState([])

    // <<< НОВИЙ СТАН для Обраного >>>
    const [wishlistItems, setWishlistItems] = useState({}); // Об'єкт { itemId: true/false } або можна зберігати дані з беку
    const [userProfileData, setUserProfileData] = useState(null);

    useEffect(() => {
        async function loadData() {
            await fetchProductList();
            const storedToken = localStorage.getItem("token"); // Зберігаємо в змінну для ясності
            if (storedToken) {
                console.log("useEffect: Знайдено токен в localStorage:", storedToken);
                setToken(storedToken); // Встановлюємо токен в стан (це для майбутніх викликів)
                // Передаємо `storedToken` безпосередньо в функції завантаження
                await loadCartData(storedToken);
                await loadWishlistData(storedToken); // Також для wishlist, якщо він є
                await loadUserProfile(storedToken);
            } else {
                console.log("useEffect: Токен в localStorage не знайдено.");
                // Якщо токена немає, можливо, варто очистити стани
                setCartItems({});
                setWishlistItems({});
                setUserProfileData(null);
            }
        }
        loadData();
    }, []);

    // Нова функція для завантаження профілю
    const loadUserProfile = async (tokenToUse) => {
        if (!tokenToUse) {
            setUserProfileData(null);
            return;
        }
        try {
            const response = await axios.get(`${url}/api/user/my-profile`, {
                headers: { Authorization: `Bearer ${tokenToUse}` }
            });
            if (response.data.success && response.data.userData) {
                setUserProfileData(response.data.userData);
                console.log("Профіль користувача завантажено в контекст:", response.data.userData);
            } else {
                console.error("Не вдалося завантажити профіль в контекст:", response.data.message);
                setUserProfileData(null);
            }
        } catch (error) {
            console.error("Помилка завантаження профілю в контекст:", error);
            setUserProfileData(null);
            // Якщо 401, можливо, треба обробити вихід користувача
            if (error.response && error.response.status === 401) {
                // Тут можна реалізувати логіку виходу / очищення токена
                localStorage.removeItem("token");
                setToken("");
                setCartItems({});
                setWishlistItems({});
                // navigate('/login'); // Перенаправлення краще робити з компонента
            }
        }
    };

    // Додай функцію оновлення профілю в контексті, якщо Profile.jsx оновлює дані
    // Це потрібно, якщо ти хочеш, щоб зміни в Profile.jsx одразу відображалися в Order.jsx
    // без перезавантаження сторінки.
    const updateUserProfileInContext = (updatedData) => {
        setUserProfileData(prev => ({ ...prev, ...updatedData }));
    };


    // --- Функція додавання в кошик (ОНОВЛЕНО для кількох розмірів одного товару) ---
    const addToCart = async (itemId, selectedSize) => {
        if (!selectedSize || selectedSize === "N/A") { 
            const productInfo = all_products.find(p => p._id === itemId);
            if (productInfo && productInfo.sizes && productInfo.sizes.length > 0) {
                alert("Будь ласка, оберіть розмір товару.");
                console.warn("Спроба додати товар без розміру, хоча він потрібен:", itemId);
                return;
            }
        }
        const cartItemKey = `${itemId}-${selectedSize}`;

        setCartItems((prevCartItems) => {
            const updatedCart = { ...prevCartItems };

            if (updatedCart[cartItemKey]) {
                // Якщо товар з таким ID та РОЗМІРОМ вже є, збільшуємо його кількість
                updatedCart[cartItemKey] = {
                    ...updatedCart[cartItemKey],
                    quantity: updatedCart[cartItemKey].quantity + 1
                };
            } else {
                // Якщо такої комбінації ID+розмір немає, додаємо новий запис
                updatedCart[cartItemKey] = {
                    itemId: itemId,       // Зберігаємо оригінальний itemId
                    size: selectedSize,   // Зберігаємо розмір
                    quantity: 1
                };
            }
            console.log("Кошик оновлено (addToCart):", updatedCart);
            return updatedCart;
        });

        if (token) {
            try {
                await axios.post(url + "/api/cart/add", {
                    itemId,
                    size: selectedSize,
                    quantity: 1 
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Помилка додавання в кошик на сервері:", error);
            }
        }
    };

    // --- Функція видалення/зменшення з кошика (ОНОВЛЕНО) ---
    // --- Функція видалення/зменшення з кошика (ОНОВЛЕНО для кількох розмірів) ---
    const removeFromCart = async (itemId, itemSize) => { // Тепер removeFromCart має знати РОЗМІР
        if (!itemSize) {
            console.warn("Спроба видалити товар без вказання розміру:", itemId);
            // Якщо товари без розміру мають фіктивний розмір "N/A", то його треба передавати.
            // Якщо це помилка, то треба обробити.
            // Для цього прикладу, припускаємо, що itemSize завжди буде передано.
        }

        const cartItemKey = `${itemId}-${itemSize}`;

        setCartItems((prevCartItems) => {
            const updatedCart = { ...prevCartItems };
            const existingItem = updatedCart[cartItemKey];

            if (existingItem) {
                if (existingItem.quantity > 1) {
                    updatedCart[cartItemKey] = {
                        ...existingItem,
                        quantity: existingItem.quantity - 1
                    };
                } else {
                    delete updatedCart[cartItemKey]; // Видаляємо запис повністю, якщо кількість стає 0
                }
            }
            console.log("Кошик оновлено (removeFromCart):", updatedCart);
            return updatedCart;
        });

        if (token) {
            try {
                // Бекенд /api/cart/remove також має очікувати itemId та size
                await axios.post(url + "/api/cart/remove", {
                    itemId,
                    size: itemSize
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Помилка видалення з кошика на сервері:", error);
                // Логіка відкату
            }
        }
    };
    // --- Розрахунок загальної суми (ОНОВЛЕНО) ---
    const getTotalCartAmount = () => {
        let totalAmount = 0;
        // Тепер перебираємо ключі cartItems (які є "itemId-size")
        for (const cartKey in cartItems) {
            const cartItem = cartItems[cartKey]; // Це об'єкт { itemId, size, quantity }
            if (cartItem && cartItem.quantity > 0) {
                // Знаходимо інформацію про товар за оригінальним itemId
                const productInfo = all_products.find((product) => product._id === cartItem.itemId);
                if (productInfo) {
                    const priceAfterDiscount = Math.round(productInfo.price * (1 - (productInfo.discount || 0) / 100));
                    totalAmount += priceAfterDiscount * cartItem.quantity;
                }
            }
        }
        return totalAmount;
    };

    // --- Розрахунок суми без знижки (ОНОВЛЕНО) ---
    const getTotalCartAmount_WithoutDiscount = () => {
        let totalAmount = 0;
        for (const cartKey in cartItems) {
            const cartItem = cartItems[cartKey];
            if (cartItem && cartItem.quantity > 0) {
                const productInfo = all_products.find((product) => product._id === cartItem.itemId);
                if (productInfo) {
                    totalAmount += productInfo.price * cartItem.quantity;
                }
            }
        }
        return totalAmount;
    };

    // --- Розрахунок загальної кількості товарів (ОНОВЛЕНО) ---
    const getTotalCartItems = () => {
        let totalItems = 0;
        for (const cartKey in cartItems) {
            const cartItem = cartItems[cartKey];
            if (cartItem && cartItem.quantity > 0) {
                totalItems += cartItem.quantity;
            }
        }
        return totalItems;
    };




    // useEffect(() => {
    //     console.log(cartItems);
    // }, [cartItems])

    // --- Функції ОБРАНОГО (НОВІ) ---
    const loadWishlistData = async (token) => {
        if (!token) return; // Немає сенсу робити запит без токена
        console.log("Завантаження даних Обраного...");
        try {
            // Згідно роутеру, це POST запит
            const response = await axios.post(url + "/api/favourite/get", {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.success) {
                console.log("Отримані дані Обраного:", response.data.favourites);
                // Зберігаємо отриманий об'єкт {itemId: count}
                setWishlistItems(response.data.favourites || {});
            } else {
                console.error("Помилка отримання Обраного (з бекенду):", response.data.message);
                setWishlistItems({}); // Очищуємо у випадку помилки
            }
        } catch (error) {
            console.error("Помилка запиту отримання Обраного:", error);
            setWishlistItems({}); // Очищуємо у випадку помилки
        }
    };

    const addToWishlist = async (itemId) => {
        if (!token) {
            console.log("Потрібна авторизація для додавання в обране");
            return;
        }
        console.log("Додавання в обране:", itemId);

        // Зберігаємо попередній стан для можливого відкату
        const previousWishlistItems = { ...wishlistItems };
        // Оптимістичне оновлення UI
        setWishlistItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));

        try {
            const response = await axios.post(url + "/api/favourite/add", { itemId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.data.success) {
                console.error("Помилка додавання в обране (з бекенду):", response.data.message);
                // Якщо бекенд повернув помилку, відкочуємо стан UI
                setWishlistItems(previousWishlistItems);
            } else {
                console.log("Товар успішно додано в обране на бекенді:", response.data);
                // Можна ще раз завантажити список обраного, щоб бути впевненим у синхронізації,
                // або покластися на те, що бекенд повернув оновлені дані (якщо він це робить)
                // await loadWishlistData(token); // Необов'язково, якщо оптимістичне оновлення достатнє
            }
        } catch (error) {
            console.error("Помилка ЗАПИТУ додавання в обране:", error.response ? error.response.data : error.message);
            // Відкочуємо стан UI у випадку помилки мережі або сервера
            setWishlistItems(previousWishlistItems);
        }
    };

    const removeFromWishlist = async (itemId) => {
        if (!token) {
            console.log("Потрібна авторизація для видалення з обраного");
            return;
        }
        console.log("Видалення з обраного:", itemId);
        const previousState = { ...wishlistItems }; // Зберігаємо попередній стан
        // Оптимістичне оновлення UI
        setWishlistItems((prev) => {
            const newState = { ...prev };
            if (newState[itemId] > 1) { // Якщо бекенд рахує кількість
                // newState[itemId] -= 1; // Тоді зменшуємо
            } else {
                delete newState[itemId]; // Інакше видаляємо ключ
            }
            return newState;
        });


        try {
            const response = await axios.post(url + "/api/favourite/remove", { itemId }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.data.success) {
                console.error("Помилка видалення з обраного (з бекенду):", response.data.message);
                // Повертаємо стан назад у випадку помилки
                setWishlistItems(previousState);
            }
        } catch (error) {
            console.error("Помилка запиту видалення з обраного:", error);
            // Повертаємо стан назад
            setWishlistItems(previousState);
        }
    };

    // Функція-перемикач для UI
    const toggleWishlist = (itemId) => {
        if (wishlistItems[itemId] && wishlistItems[itemId] > 0) { // Перевіряємо чи є і кількість > 0 (згідно з бекендом)
            removeFromWishlist(itemId);
        } else {
            addToWishlist(itemId);
        }
    };

    const fetchProductList = async () => {
        const response = await axios.get(url + "/api/product/list-product");
        setAll_products(response.data.data);
    };

    const loadCartData = async (tokenToUse) => { // <--- (A) Тепер приймає аргумент
        console.log("loadCartData викликана з токеном:", tokenToUse); // <--- (B) Виводимо токен, який прийшов
        if (!tokenToUse) {       // <--- (C) Перевіряємо токен, який прийшов як аргумент
            console.warn("loadCartData: Токен не передано або він порожній — неможливо завантажити кошик.");
            setCartItems({}); // Очищуємо кошик, якщо немає токену
            return;
        }

        try {
            const response = await axios.post(`${url}/api/cart/get`, {}, {
                headers: {
                    Authorization: `Bearer ${tokenToUse}` // <--- (D) Використовуємо токен з аргументу
                }
            });
            if (response.data.success) {
                console.log("loadCartData: Отримані дані кошика:", response.data.cartData)
                setCartItems(response.data.cartData || {}); // Додано || {} для безпеки
            } else {
                console.error("loadCartData: Помилка при отриманні кошика (з бекенду):", response.data.message);
                setCartItems({});
            }
        } catch (error) {
            console.error("loadCartData: Запит на кошик не вдався:", error.response ? error.response.data : error.message);
            setCartItems({});
        }
    };

    const clearCart = () => {
        setCartItems({});
        console.log("Кошик очищено на фронтенді (в ShopContext)");
    };


    const contextValue = {
        all_products,
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        getTotalCartItems,
        url,
        token,
        setToken,
        wishlistItems,
        setWishlistItems,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        getTotalCartAmount_WithoutDiscount,
        userProfileData,
        loadUserProfile,          // якщо треба перезавантажувати профіль
        updateUserProfileInContext, // <--- Для оновлення з Profile.jsx
        clearCart,
    };

    // const value = {
    //     cartItems: [
    //         { id: 1, name: "Товар 1", price: 100, quantity: 1 },
    //         { id: 2, name: "Товар 2", price: 200, quantity: 2 }
    //     ],
    //     getTotalCartAmount: () => 500, // Заглушка для загальної суми
    //     token: "example-token", // Заглушка для токену
    //     all_products: [
    //         { id: 1, name: "Товар 1", price: 100 },
    //         { id: 2, name: "Товар 2", price: 200 }
    //     ], // Заглушка для списку товарів
    //     url: "https://api.example.com" // Заглушка для URL API
    // };

    // return (
    //     <ShopContext.Provider value={value}>
    //         {children}
    //     </ShopContext.Provider>
    // );


    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    );
}

export default ShopContextProvider
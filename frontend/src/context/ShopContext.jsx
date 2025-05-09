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
            } else {
                console.log("useEffect: Токен в localStorage не знайдено.");
                // Якщо токена немає, можливо, варто очистити стани
                setCartItems({});
                setWishlistItems({});
            }
        }
        loadData();
    }, []);

    const addToCart = async (itemId) => {
        if (!cartItems[itemId]) {
            setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
        } else {
            setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
        }
        if (token) {
            await axios.post(url + "/api/cart/add", { itemId }, { headers: {
                Authorization: `Bearer ${token}`
            } })
        }
    };
    const removeFromCart = async (itemId) => {
        setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
        if (token) {
            await axios.post(url + "/api/cart/remove", { itemId }, { headers: {
                Authorization: `Bearer ${token}`
            } })
        }
    };


    // get total cart amount
    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                let itemInfo = all_products.find((product) => product._id === item);
                totalAmount += Math.round( itemInfo.price * (1 -  itemInfo.discount / 100)) * cartItems[item];
            }
        }
        return totalAmount;
    }

    // get total cart items
    const getTotalCartItems = () => {
        let totalItems = 0;
        for (const item in cartItems) {
            totalItems += cartItems[item];
        }
        return totalItems;
    }

    // useEffect(() => {
    //     console.log(cartItems);
    // }, [cartItems])

     // --- Функції ОБРАНОГО (НОВІ) ---
     const loadWishlistData = async (token) => {
        if (!token) return; // Немає сенсу робити запит без токена
        console.log("Завантаження даних Обраного...");
        try {
           // Згідно роутеру, це POST запит
            const response = await axios.post(url + "/api/favourite/get", {}, { headers: {
                Authorization: `Bearer ${token}`
            } });
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
            const response = await axios.post(url + "/api/favourite/remove", { itemId }, { headers: {
                Authorization: `Bearer ${token}`
            } });
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
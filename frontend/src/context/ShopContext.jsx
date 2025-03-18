import axios from "axios";
import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const ShopContextProvider = (props) => {
    const [cartItems, setCartItems] = useState({});
    const url = "http://localhost:4000";
    const [token, setToken] = useState("");
    const [all_products, setAll_products] = useState([])

    const addToCart = async (itemId) => {
        if (!cartItems[itemId]) {
            setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
        } else {
            setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
        }
        if (token) {
            await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } })
        }
    };
    const removeFromCart = async (itemId) => {
        setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
        if (token) {
            await axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } })
        }
    };


    // get total cart amount
    const getTotalCartAmount = () => {
        let totalItems = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                let itemInfo = all_products.find((product) => product._id === item);
                totalAmount += itemInfo.price * cartItems[item];
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

    const fetchProductList = async () => {
        const response = await axios.get(url + "/api/product/list");
        setAll_products(response.data.data);
    };

    const loadCartData = async (token) => {
        const response = await axios.post(url + "/api/cart/get", {}, { headers: { token } });
        setCartItems(response.data.cartData);
    }

    useEffect(() => {
        async function loadData() {
            await fetchProductList();
            if (localStorage.getItem("token")) {
                setToken(localStorage.getItem("token"));
                await loadCartData(localStorage.getItem("token"))
            }
        }
        loadData();
    }, []);

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
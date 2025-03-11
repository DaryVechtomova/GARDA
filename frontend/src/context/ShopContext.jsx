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

useEffect(() => {
    if (localStorage.getItem("token")) {
        setToken(localStorage.getItem("token"));
    }
}, []);
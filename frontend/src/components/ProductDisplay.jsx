import React, { useState, useEffect } from "react";
import { all_products } from "../assets/data";
import Item from "./Item";

const ProductDisplay = () => {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Лінійна інтерполяція для плавного змінення відступів
    const interpolate = (value, x1, y1, x2, y2) => {
        return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    };

    // Розрахунок відступів для контейнера
    const calculateMarginTop = () => {
        const mobileMarginTop = -200; // 400px для мобільної версії
        const desktopMarginTop = 250; // 200px для десктопної версії

        return interpolate(windowWidth, 600, mobileMarginTop, 1540, desktopMarginTop);
    };

    return (
        <section id="shop" className="max-w-screen-lg mx-auto py-16" style={{ marginTop: `${calculateMarginTop()}px` }}>
            {/* container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-20">
                {all_products.map((product) => (
                    <div key={product._id} className="flex justify-center">
                        <Item product={product} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductDisplay;
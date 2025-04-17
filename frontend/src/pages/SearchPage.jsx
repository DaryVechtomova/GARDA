import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import Item from "../components/Item"; 
import { ShopContext } from "../context/ShopContext";

const SearchPage = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');
    const [searchResults, setSearchResults] = useState([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const { url } = useContext(ShopContext);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch(`${url}/api/product/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                setSearchResults(data);
            } catch (error) {
                console.error('Помилка пошуку:', error);
            }
        };

        if (query) {
            fetchResults();
        }
    }, [query, url]);

    // Лінійна інтерполяція для плавного змінення відступів
    const interpolate = (value, x1, y1, x2, y2) => {
        return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    };

    // Розрахунок відступів для контейнера
    const calculateMarginTop = () => {
        const mobileMarginTop = 40; // Змінено на позитивне значення
        const desktopMarginTop = 80; // Збільшено для десктопної версії

        return interpolate(windowWidth, 600, mobileMarginTop, 1540, desktopMarginTop);
    };

    return (
        <section 
            id="search-results" 
            className="max-w-screen-lg mx-auto py-16 min-h-[70vh] flex flex-col"
            style={{ 
                marginTop: `${calculateMarginTop()}px`,
                paddingBottom: "100px" // Додаємо відступ знизу
            }}
        >
            <h2 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }} 
                className="text-2xl font-bold mb-8 text-center"
            >
                Результати пошуку для "{query}"
            </h2>
            
            {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-20 flex-grow">
                    {searchResults.map(product => (
                        <div key={product._id} className="flex justify-center">
                            <Item product={product} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-center text-lg">Товарів не знайдено</p>
                </div>
            )}
        </section>
    );
};

export default SearchPage;
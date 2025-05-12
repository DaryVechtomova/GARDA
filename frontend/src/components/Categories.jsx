// src/components/Categories.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- Імпортуємо Link
import { categories } from '../assets/data'; // Переконайтесь, що шлях правильний
import '../assets/fonts/fonts.css';
import flower from "../assets/design/flower-categories.png";

// Прибираємо пропси category та setCategory, вони більше не потрібні тут
const Categories = () => {
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

    // --- Функції для стилів (без змін) ---
    const interpolate = (value, x1, y1, x2, y2) => {
        return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    };
    const calculateStyles = (minWidth, maxWidth, minStyle, maxStyle) => {
        return {
            width: `${interpolate(windowWidth, 320, minStyle.width, 1540, maxStyle.width)}px`,
            height: `${interpolate(windowWidth, 320, minStyle.height, 1540, maxStyle.height)}px`,
            left: `${interpolate(windowWidth, 320, minStyle.left, 1540, maxStyle.left)}px`,
            top: `${interpolate(windowWidth, 320, minStyle.top, 1540, maxStyle.top)}px`,
        };
    };
    const mobileStyles = {
        flower: { width: 285, height: 215, left: -6, top: 1270 },
        section: { top: -320 },
    };
    const desktopStyles = {
        flower: { width: 570.11, height: 429.66, left: -12, top: 450 },
        section: { top: 0 },
    };
    const flowerStyles = calculateStyles(600, 1540, mobileStyles.flower, desktopStyles.flower);
    const sectionTop = interpolate(windowWidth, 600, mobileStyles.section.top, 1540, desktopStyles.section.top);

    // --- Функція для перетворення назви категорії в URL-слаг ---
    // Налаштуйте цю функцію відповідно до ваших назв категорій у data.js
    const getCategorySlugFromName = (name) => {
        const lowerCaseName = name?.toLowerCase() || '';
        switch (lowerCaseName) {
            case 'для жінок': return 'women';
            case 'для чоловіків': return 'men';
            case 'аксесуари': return 'accessories';
            // Додайте інші ваші категорії тут
            default: return 'all'; // Якщо категорія невідома, можна вести на 'all' або обробити інакше
        }
    };

    return (
        <section id="categories" className="max-padd-container pt-40 relative" style={{
            top: `${sectionTop}px`,
        }}>
            <img
                src={flower}
                alt="flower"
                className="absolute"
                style={{ ...flowerStyles }}
            />
            <div className="flex flex-col items-center relative">
                <div className="absolute" style={{
                    left: 'clamp(110px, 20vw, 280px)',
                    top: '0'
                }}>
                    <h4 className="text-4xl font-extrabold leading-none font-ace pb-20">
                        <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>
                            Категорії
                        </span>
                    </h4>
                </div>

                {/* --- ОНОВЛЕНИЙ КОНТЕЙНЕР КАТЕГОРІЙ --- */}
                <div className="flex justify-center gap-12 flex-wrap w-full" style={{ maxWidth: '1200px', marginTop: '80px' }}>
                    {categories.map((item) => {
                        // Визначаємо URL-слаг для посилання
                        const categorySlug = getCategorySlugFromName(item.name);
                        const linkPath = `/catalog/${categorySlug}`; // Формуємо шлях

                        return (
                            // Обгортаємо кожен елемент категорії в Link
                            <Link
                                to={linkPath} // Встановлюємо шлях навігації
                                key={item.name}
                                className="flex flex-col items-center group" // Додаємо group для можливого ховер-ефекту
                            >
                                {/* Прибираємо onClick з цього div */}
                                <div className="overflow-hidden rounded-lg"> {/* Додано для кращого ховер ефекту */}
                                    <img
                                        src={item.image}
                                        alt={item.name} // Використовуємо item.name для alt
                                        height={300}
                                        width={300}
                                        className="rounded-lg transition-transform duration-300 ease-in-out group-hover:scale-105" // Ефект при ховері
                                    />
                                </div>
                                {/* Прибираємо динамічний клас, бо активний стан тут не відстежується */}
                                <h4 className="mt-6 regular-18 group-hover:text-secondary transition-colors duration-200"> {/* Простий ховер ефект */}
                                    {item.name}
                                </h4>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Categories;
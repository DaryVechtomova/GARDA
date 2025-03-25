import React, { useState, useEffect } from 'react';
import { categories } from '../assets/data';
import '../assets/fonts/fonts.css';
import flower from "../assets/design/flower-categories.png"; // Імпорт зображення

const Categories = ({ category, setCategory }) => {
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

    // Лінійна інтерполяція для плавного змінення розмірів
    const interpolate = (value, x1, y1, x2, y2) => {
        return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    };

    // Розрахунок розмірів для flower-categories
    const calculateStyles = (minWidth, maxWidth, minStyle, maxStyle) => {
        return {
            width: `${interpolate(windowWidth, 600, minStyle.width, 1540, maxStyle.width)}px`,
            height: `${interpolate(windowWidth, 600, minStyle.height, 1540, maxStyle.height)}px`,
            left: `${interpolate(windowWidth, 600, minStyle.left, 1540, maxStyle.left)}px`,
            top: `${interpolate(windowWidth, 600, minStyle.top, 1540, maxStyle.top)}px`,
        };
    };

    // Стилі для мобільної версії (600px)
    const mobileStyles = {
        flower: { width: 285, height: 215, left: -6, top: 1200 },
        section: { top: -350 },
    };

    // Стилі для десктопної версії (1530px)
    const desktopStyles = {
        flower: { width: 570.11, height: 429.66, left: -12, top: 450 }, // Початкове значення top
        section: { top: 0 }, // Початкове значення top
    };

    // Розрахунок поточних стилів для flower-categories
    const flowerStyles = calculateStyles(600, 1540, mobileStyles.flower, desktopStyles.flower);

    // Розрахунок поточних стилів для розділу
    const sectionTop = interpolate(windowWidth, 600, mobileStyles.section.top, 1540, desktopStyles.section.top);

    return (
        <section id="categories" className="max-padd-container pt-40 relative" style={{
            top: `${sectionTop}px`, // Адаптивне зміщення розділу
        }}>
            {/* Картинка flower-categories */}
            <img
                src={flower}
                alt="flower"
                className="absolute"
                style={{
                    ...flowerStyles,
                }}
            />

            {/* Контейнер для заголовка та категорій */}
            <div className="flex flex-col items-center relative">
                {/* Заголовок з адаптивним зміщенням */}
                <div className="absolute" style={{
                    left: 'clamp(110px, 20vw, 280px)',
                    top: '0'
                }}>
                    <h4 className="text-4xl font-extrabold leading-none font-ace pb-20">
                        <span style={{ fontFamily: 'NyghtSerif', fontWeight: 1000 }}>
                            Категорії
                        </span>
                    </h4>
                </div>

                {/* Контейнер категорій, вирівняний по центру */}
                <div className="flex justify-center gap-12 flex-wrap w-full" style={{ maxWidth: '1200px', marginTop: '80px' }}>
                    {categories.map((item) => (
                        <div onClick={() => setCategory((prev) => (prev === item.name ? "All" : item.name))} id={item.name} key={item.name} className="flex flex-col items-center">
                            <div >
                                <img
                                    src={item.image}
                                    alt="categoryImg"
                                    height={300}
                                    width={300}
                                    className="rounded-lg"
                                />
                            </div>
                            <h4 className={`mt-6 regular-18 ${category === item.name ? "border-b-2 border-secondary" : "border-b-4 border-white"}`}>{item.name}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Categories;
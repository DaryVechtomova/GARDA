// src/pages/CatalogPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import Item from "../components/Item";
import { ShopContext } from "../context/ShopContext";
import { IoOptionsOutline } from "react-icons/io5";
import { HiX } from "react-icons/hi";
import Flower from "../assets/design/flower.png";

const CatalogPage = () => {
    const { category: categorySlug } = useParams();
    const { all_products } = useContext(ShopContext);
    console.log('CatalogPage: Initial all_products from context:', all_products); // DEBUG

    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [availableColors, setAvailableColors] = useState([]);
    const [availableSizes, setAvailableSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState(new Set());
    const [selectedSizes, setSelectedSizes] = useState(new Set());

    const [pageTitle, setPageTitle] = useState("Каталог товарів");
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const categoryNameMap = {
        'women': 'Для жінок',
        'men': 'Для чоловіків',
        'accessories': 'Аксесуари',
    };
    const getCategoryNameFromSlug = (slug) => {
        if (slug === 'all' || !slug) return 'All';
        return categoryNameMap[slug?.toLowerCase()] || null;
    };
    const getPageTitle = (slug) => {
        switch ((slug || 'all').toLowerCase()) {
            case 'women': return 'Товари для жінок';
            case 'men': return 'Товари для чоловіків';
            case 'accessories': return 'Аксесуари';
            case 'all': return 'Каталог товарів';
            default: return 'Каталог товарів';
        }
    };

    // --- Ефект для вилучення доступних кольорів та розмірів ---
    useEffect(() => {
        console.log('Extracting filters useEffect: Running...'); // DEBUG
        if (all_products && all_products.length > 0) {
            console.log('Extracting filters: Found products', all_products.length); // DEBUG
            const colorsSet = new Set();
            const sizesSet = new Set();

            all_products.forEach((product, index) => {
                // DEBUG: Логуємо дані конкретного продукту
                // if (index < 5) { // Логуємо тільки перші 5 для чистоти
                //     console.log(`Product ${index} colors:`, product.colors, `Type: ${typeof product.colors}`);
                //     console.log(`Product ${index} sizes:`, product.sizes, `Is Array: ${Array.isArray(product.sizes)}`);
                // }

                if (product.colors && typeof product.colors === 'string') { // Перевірка на рядок
                    colorsSet.add(product.colors.trim());
                } else if (product.colors) {
                    console.warn(`Product ID ${product._id} has unexpected colors type: ${typeof product.colors}`, product.colors); // DEBUG
                }

                if (product.sizes && Array.isArray(product.sizes)) {
                    product.sizes.forEach(sizeObj => {
                        if (sizeObj.size && typeof sizeObj.size === 'string') { // Перевірка на рядок
                            sizesSet.add(sizeObj.size.trim());
                        } else if (sizeObj.size) {
                            console.warn(`Product ID ${product._id} has unexpected size type in sizes array: ${typeof sizeObj.size}`, sizeObj.size); // DEBUG
                        }
                    });
                } else if (product.sizes) {
                    console.warn(`Product ID ${product._id} has non-array sizes field:`, product.sizes); // DEBUG
                }
            });

            const sortedColors = Array.from(colorsSet).sort();
            const sortedSizes = Array.from(sizesSet).sort(); // Можна додати кастомне сортування для розмірів

            console.log('Extracting filters: Available Colors:', sortedColors); // DEBUG
            console.log('Extracting filters: Available Sizes:', sortedSizes); // DEBUG

            setAvailableColors(sortedColors);
            setAvailableSizes(sortedSizes);
        } else {
            console.log('Extracting filters: No products found or empty array.'); // DEBUG
            setAvailableColors([]);
            setAvailableSizes([]);
        }
    }, [all_products]);

    // --- Основний ефект для фільтрації товарів ---
    useEffect(() => {
        console.log('Filtering products useEffect: Running...'); // DEBUG
        console.log('Dependencies changed:', { categorySlug, all_products_count: all_products?.length, selectedColors_size: selectedColors.size, selectedSizes_size: selectedSizes.size }); // DEBUG

        setPageTitle(getPageTitle(categorySlug));

        if (all_products && all_products.length > 0) {
            const categoryNameToFilterBy = getCategoryNameFromSlug(categorySlug);
            console.log('Filtering by category name:', categoryNameToFilterBy); // DEBUG

            // 1. Фільтрація за категорією
            let categoryFiltered = [];
            if (categoryNameToFilterBy === 'All') {
                categoryFiltered = all_products;
            } else if (categoryNameToFilterBy) {
                categoryFiltered = all_products.filter(product =>
                    product.category &&
                    product.category.toLowerCase() === categoryNameToFilterBy.toLowerCase()
                );
            } else {
                categoryFiltered = all_products; // Якщо слаг невідомий, показуємо все
            }
            console.log('After category filter count:', categoryFiltered.length); // DEBUG

            // 2. Фільтрація за вибраними кольорами
            let colorFiltered = categoryFiltered;
            if (selectedColors.size > 0) {
                console.log('Filtering by colors:', Array.from(selectedColors)); // DEBUG
                colorFiltered = categoryFiltered.filter(product =>
                    product.colors && typeof product.colors === 'string' && selectedColors.has(product.colors.trim())
                );
                console.log('After color filter count:', colorFiltered.length); // DEBUG
            }

            // 3. Фільтрація за вибраними розмірами
            let sizeFiltered = colorFiltered;
            if (selectedSizes.size > 0) {
                console.log('Filtering by sizes:', Array.from(selectedSizes)); // DEBUG
                sizeFiltered = colorFiltered.filter(product =>
                    product.sizes && Array.isArray(product.sizes) &&
                    product.sizes.some(sizeObj => sizeObj.size && typeof sizeObj.size === 'string' && selectedSizes.has(sizeObj.size.trim()))
                );
                console.log('After size filter count:', sizeFiltered.length); // DEBUG
            }

            console.log('Final filtered products count:', sizeFiltered.length); // DEBUG
            setFilteredProducts(sizeFiltered);

        } else {
            console.log('Filtering products useEffect: No base products to filter.'); // DEBUG
            setFilteredProducts([]);
        }
    }, [categorySlug, all_products, selectedColors, selectedSizes]); // Залежності

    // --- Обробники зміни фільтрів ---
    const handleColorChange = (color) => {
        console.log('handleColorChange:', color); // DEBUG
        setSelectedColors(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(color)) {
                newSelected.delete(color);
            } else {
                newSelected.add(color);
            }
            console.log('New selectedColors:', newSelected); // DEBUG
            return newSelected;
        });
    };

    const handleSizeChange = (size) => {
        console.log('handleSizeChange:', size); // DEBUG
        setSelectedSizes(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(size)) {
                newSelected.delete(size);
            } else {
                newSelected.add(size);
            }
            console.log('New selectedSizes:', newSelected); // DEBUG
            return newSelected;
        });
    };

    const clearFilters = () => {
        console.log('Clearing filters'); // DEBUG
        setSelectedColors(new Set());
        setSelectedSizes(new Set());
        setIsFilterOpen(false);
    };

    const toggleFilterPanel = () => { // Функція для кнопки
        console.log('Toggling filter panel'); // DEBUG
        setIsFilterOpen(prev => !prev);
    }


    // --- Код для відступів та ширини вікна (без змін) ---
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const interpolate = (value, x1, y1, x2, y2) => y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    const calculateMarginTop = () => interpolate(windowWidth, 600, 40, 1540, 80);

    return (
        <>
            <section
                id="catalog-page"
                className="max-w-screen-xl mx-auto py-10 min-h-[70vh] flex flex-col px-4 sm:px-6 lg:px-8 relative"
                style={{
                    paddingTop: '6rem',
                    paddingBottom: "100px"
                }}
            >
                {/* --- КНОПКА ВІДКРИТТЯ ФІЛЬТРІВ --- */}
                <div
                    className="absolute top-45 right-100 sm:left-6 lg:left-8 flex flex-col items-center gap-1 cursor-pointer z-10 transform translate-x-[-125px]"
                    onClick={toggleFilterPanel} // Використовуємо нову функцію
                >
                    <IoOptionsOutline className="text-2xl hover:text-secondary sm:text-3xl" />
                    <span className="text-sm hidden sm:block">Фільтрувати</span>
                </div>

                {/* Заголовок сторінки з квітками */}
                <div className="flex items-center justify-center mb-5 md:mb-5">
                    <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain mr-2 sm:mr-3 md:mr-4 transform translate-y-[10px]" />
                    <h2 style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }} className="text-xl sm:text-2xl md:text-3xl text-center text-black">
                       {getPageTitle()}
                    </h2>
                    <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain ml-2 sm:ml-3 md:ml-4 transform translate-y-[10px]" />
                </div>


                {/* --- ОСНОВНИЙ КОНТЕНТ --- */}
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 flex-grow">
                        {filteredProducts.map(product => (
                            <div key={product._id} className="flex justify-center">
                                <Item product={product} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center min-h-[40vh]">
                        {/* Показуємо різний текст залежно від того, чи є базові товари */}
                        {all_products && all_products.length > 0 ? (
                            <p className="text-center text-lg">Товарів за обраними фільтрами не знайдено.</p>
                        ) : (
                            <p className="text-center text-lg">Завантаження товарів...</p>
                        )}
                    </div>
                )}
            </section>

            {/* --- ПАНЕЛЬ ФІЛЬТРІВ (Sidebar) --- */}
            {/* Перевіряємо isFilterOpen */}
            {isFilterOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-40"
                    onClick={toggleFilterPanel} // Закриваємо по кліку на фон
                >
                    <div
                        className="fixed top-0 left-0 h-full w-72 md:w-80 bg-white shadow-xl z-50 p-6 overflow-y-auto flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Заголовок панелі та кнопка закриття */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Montserrat Alternates' }}>Фільтри</h3>
                            <button onClick={toggleFilterPanel} className="text-2xl text-gray-500 hover:text-gray-800"> {/* Закриваємо */}
                                <HiX />
                            </button>
                        </div>

                        {/* Секція кольорів */}
                        <div className="mb-6">
                            <h4 className="text-lg font-medium mb-3" style={{ fontFamily: 'Montserrat Alternates' }}>Кольори</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {availableColors.length > 0 ? availableColors.map(color => (
                                    <label key={color} className="flex items-center cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            value={color}
                                            checked={selectedColors.has(color)}
                                            onChange={() => handleColorChange(color)}
                                            className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {color || "Не вказано"} {/* Додано перевірку на порожній рядок */}
                                    </label>
                                )) : <p className="text-sm text-gray-500">Немає доступних</p>}
                            </div>
                        </div>

                        {/* Секція розмірів */}
                        <div className="mb-6">
                            <h4 className="text-lg font-medium mb-3" style={{ fontFamily: 'Montserrat Alternates' }}>Розміри</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {availableSizes.length > 0 ? availableSizes.map(size => (
                                    <label key={size} className="flex items-center cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            value={size}
                                            checked={selectedSizes.has(size)}
                                            onChange={() => handleSizeChange(size)}
                                            className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {size || "Не вказано"} {/* Додано перевірку на порожній рядок */}
                                    </label>
                                )) : <p className="text-sm text-gray-500">Немає доступних</p>}
                            </div>
                        </div>

                        {/* Кнопка очищення фільтрів */}
                        <div className="mt-auto pt-4 border-t">
                            <button
                                onClick={clearFilters}
                                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Очистити фільтри
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default CatalogPage;
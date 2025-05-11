import React, { useState, useContext, useEffect } from "react";
import { FaMinus, FaPlus } from "react-icons/fa6"; // Використовуємо FaHeart, якщо потрібно
import { ShopContext } from "../context/ShopContext";
import { useNavigate } from "react-router-dom";
import ArrowIcon from '../assets/design/Arrow.png';
import ProductDescription from '../components/ProductDescription';
import ProductComments from '../components/ProductComments';
import { toast } from 'react-toastify';

const ProductMd = ({ product }) => {
    const [selectedSize, setSelectedSize] = useState(null);
    // Переконайтесь, що 'url' отримується з контексту
    const contextValue = useContext(ShopContext);

    // Обережний доступ до значень контексту
    const cartItems = contextValue?.cartItems;
    const addToCart = contextValue?.addToCart;
    const removeFromCart = contextValue?.removeFromCart;
    const url = contextValue?.url;
    const wishlistItems = contextValue?.wishlistItems; // Має бути {} якщо не завантажено/немає токена
    const toggleWishlist = contextValue?.toggleWishlist;
    const token = contextValue?.token;

    // useNavigate не залежить від контексту, але використовується тут
    const navigate = useNavigate(); // Залишаємо

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sliderIndex, setSliderIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('description');
    const [visibleStartIndex, setVisibleStartIndex] = useState(0);
    const [isCurrentProductFavorited, setIsCurrentProductFavorited] = useState(false);
    useEffect(() => {
        if (product && product._id && wishlistItems) {
            // Перевіряємо, чи wishlistItems не порожній і чи містить ключ
            const favorited = !!(wishlistItems[product._id] && wishlistItems[product._id] > 0);
            setIsCurrentProductFavorited(favorited);
        } else {
            // Якщо product або wishlistItems не доступні, вважаємо, що товар не в улюблених
            setIsCurrentProductFavorited(false);
        }
    }, [wishlistItems, product]);

    // --- Перевірка наявності даних ---
    if (!product || !product.images || product.images.length === 0) {
        // Перевіряємо також наявність 'url'
        if (!url) {
            console.error("ShopContext не надав 'url'");
            return <div>Помилка завантаження: відсутній базовий URL.</div>;
        }
        return <div>Завантаження деталей товару...</div>;
    }
    // Перевіряємо наявність 'url' навіть якщо продукт є
    if (!url) {
        console.error("ShopContext не надав 'url'");
        // Можна показати помилку або повернути null/заглушку
        return <div>Помилка завантаження: відсутній базовий URL.</div>;
    }


    const totalImages = product.images.length;
    const numberOfVisibleSmallImages = 2;

    // --- Розрахунки розмірів слайдера (ваш код) ---
    // ... (залишаємо ваш код для sliderTrackHeight, etc.) ...
    let sliderTrackHeight = 290; let sliderThumbHeight = 44; let sliderTrackElementTop = 97; let sliderTrackOffsetWithinControls = sliderTrackElementTop - 40; if (typeof window !== 'undefined') { const screenWidth = window.innerWidth; if (screenWidth >= 320 && screenWidth <= 450) { sliderTrackHeight = 161; sliderThumbHeight = 24; sliderTrackElementTop = 62; sliderTrackOffsetWithinControls = sliderTrackElementTop; } else if (screenWidth >= 451 && screenWidth <= 999) { sliderTrackHeight = 290; sliderThumbHeight = 44; sliderTrackElementTop = 188; sliderTrackOffsetWithinControls = 188 - 131; } else if (screenWidth >= 1000 && screenWidth <= 1439) { sliderTrackHeight = 249; sliderThumbHeight = 38; sliderTrackElementTop = 102; sliderTrackOffsetWithinControls = 102 - 53; } else { sliderTrackHeight = 290; sliderThumbHeight = 44; sliderTrackElementTop = 97; sliderTrackOffsetWithinControls = 97 - 40; } }

    // --- useEffect для видимих картинок (ваш код) ---
    useEffect(() => {
        // ... (залишаємо ваш код для visibleStartIndex) ...
        if (totalImages <= numberOfVisibleSmallImages) { setVisibleStartIndex(0); return; } let newVisibleStartIndex = visibleStartIndex; const currentEndVisibleIndex = visibleStartIndex + numberOfVisibleSmallImages - 1; if (sliderIndex < visibleStartIndex) { newVisibleStartIndex = sliderIndex; } else if (sliderIndex > currentEndVisibleIndex) { newVisibleStartIndex = sliderIndex - numberOfVisibleSmallImages + 1; } newVisibleStartIndex = Math.max(0, Math.min(newVisibleStartIndex, totalImages - numberOfVisibleSmallImages)); if (newVisibleStartIndex !== visibleStartIndex) { setVisibleStartIndex(newVisibleStartIndex); }
    }, [sliderIndex, visibleStartIndex, totalImages, numberOfVisibleSmallImages]);

    // --- Обробники (код з stopPropagation) ---
    const handlePrevImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === 0 ? totalImages - 1 : sliderIndex - 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    const handleNextImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === totalImages - 1 ? 0 : sliderIndex + 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    const handleSmallImageClick = (index) => { if (index >= 0 && index < totalImages) { setCurrentImageIndex(index); setSliderIndex(index); } };
    const handleMainImageClick = () => { if (url + "/images/" + product.images[currentImageIndex]) { window.open(url + "/images/" + product.images[currentImageIndex], '_blank'); } };
    const handleToggleFavorite = (event) => {
        event.stopPropagation();
        if (!token) { // Перевірка токена
            alert("Будь ласка, увійдіть до акаунту, щоб додавати товари до обраного.");
            return;
        }
        // Перевірка наявності toggleWishlist і product._id
        if (toggleWishlist && product && product._id) {
            toggleWishlist(product._id);
            // Оптимістичне оновлення локального стану, якщо потрібно (але useEffect вже це робить при зміні wishlistItems)
            // setIsCurrentProductFavorited(prev => !prev); // Можна, але useEffect краще для синхронізації
        } else {
            console.error("Неможливо оновити статус улюбленого: функція toggleWishlist або ID товару відсутні.");
        }
    };
    // Ця функція буде викликатися при кліку на кнопку "Додати в кошик"
    const handleAddToCartClick = () => {
        if (!product || !product._id) {
            console.error("Product ID не визначено");
            return;
        }
        if (!addToCart) { // addToCart береться з useContext(ShopContext)
            console.error("Функція addToCart не знайдена в контексті!");
            return;
        }

        // Перевірка: якщо товар має розміри, але розмір НЕ обраний
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast.warn("Будь ласка, оберіть розмір."); // Показуємо попередження
            return; // Не додаємо товар в кошик
        }

        // Визначаємо, який розмір передавати: обраний, або "N/A" якщо розмірів у товару немає
        const sizeToAdd = (product.sizes && product.sizes.length > 0) ? selectedSize : "N/A";

        addToCart(product._id, sizeToAdd); // Викликаємо addToCart з ID товару ТА РОЗМІРОМ
       toast.success(`${product.name} додано до кошика!`); // Можна замінити на toast сповіщення
    };
   

    const handleRemoveFromCart = (event) => { event.stopPropagation(); removeFromCart(product._id); }
    const handleAddToCartWrapper = (event) => { // Перейменував, щоб уникнути конфлікту імен, якщо addToCart з контексту використовується напряму
        event.stopPropagation();
        if (!product || !product._id) {
            console.error("Product ID не визначено");
            return;
        }
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            // Якщо товар має розміри, але розмір не обрано
            alert("Будь ласка, оберіть розмір."); // Або toast.error, якщо використовуєте
            return;
        }
        // Якщо товару немає в кошику або якщо addToCart сам обробляє збільшення кількості
        // addToCart з контексту тепер очікує (itemId, selectedSize)
        if (addToCart) { // Перевірка, чи функція існує в контексті
            addToCart(product._id, selectedSize || "N/A"); // Передаємо selectedSize, або "N/A" якщо розмірів немає
        } else {
            console.error("Функція addToCart не доступна з контексту");
        }
    };
    const handleIncrementCartItem = (event) => {
        event.stopPropagation();
        if (addToCart && product && product._id) {
            // Потрібно знати, який розмір вже в кошику для цього товару, щоб збільшити його кількість
            // Або якщо addToCart достатньо розумна, щоб знайти існуючий товар і збільшити кількість
            const currentCartItem = cartItems && cartItems[product._id];
            const sizeOfItemInCart = currentCartItem ? currentCartItem.size : selectedSize; // Беремо розмір з кошика або обраний

            if (sizeOfItemInCart) {
                addToCart(product._id, sizeOfItemInCart);
            } else if (product.sizes && product.sizes.length > 0) {
                alert("Будь ласка, спочатку оберіть розмір та додайте товар у кошик.");
            } else {
                addToCart(product._id, "N/A"); // Для товарів без розміру
            }
        }
    };


    // Розрахунок кількості в кошику для поточного товару (якщо cartItems зберігає об'єкти)
    const currentItemDataInCart = product && product._id ? cartItems?.[product._id] : null;
    const currentQuantityInCart = currentItemDataInCart ? currentItemDataInCart.quantity : 0;


    const sizeListText = product.sizes?.map(sizeObj => sizeObj.size).join(' ') || 'Немає';
    const thumbTopWithinTrack = totalImages > 1 ? (sliderTrackHeight - sliderThumbHeight) * (sliderIndex / (totalImages - 1)) : 0;


    // --- Перевіряємо, чи є поточний індекс дійсним ---
    const currentImageFilename = product.images[currentImageIndex];

    const scrollableStyle = {
        maxHeight: '200px', // Максимальна висота блоку
        overflowY: 'auto',  // Вертикальний скролбар при потребі
        paddingRight: '8px',// Відступ для скролбару
        // ВАЖЛИВО: Переконайтесь, що тут немає 'height: ...' або 'overflow: hidden'
        // Додайте інші стилі, якщо вони потрібні і не в CSS
        marginTop: '1rem', // Наприклад
        marginBottom: '1rem',
    };

    return (
        <section className="product-container ProductMd-section">
            <div className="flowers-left"></div>
            <div className="flowers-right"></div>

            <div className="product-images-container">
                {/* Slider Controls */}
                {totalImages > 1 && (
                    <div className="slider-controls">
                        <button className="slider-arrow up-arrow" onClick={handlePrevImage} aria-label="Previous image"><img src={ArrowIcon} alt="Up" /></button>
                        <div className="slider-track"><div className="slider-thumb" style={{ top: `${thumbTopWithinTrack}px` }}></div></div>
                        <button className="slider-arrow down-arrow" onClick={handleNextImage} aria-label="Next image"><img src={ArrowIcon} alt="Down" /></button>
                    </div>
                )}

                {/* Small Images */}
                <div className="small-images">
                    {product.images
                        .slice(visibleStartIndex, visibleStartIndex + numberOfVisibleSmallImages)
                        .map((imgFilename, indexInSlice) => { // Перейменовано змінну для ясності
                            const originalIndex = visibleStartIndex + indexInSlice;
                            // Перевірка, чи ім'я файлу не порожнє
                            if (!imgFilename) return null; // Пропускаємо, якщо ім'я файлу відсутнє
                            return (
                                <img
                                    key={originalIndex}
                                    // === ВИПРАВЛЕННЯ: Додаємо url + "/images/" ===
                                    src={`${url}/images/${imgFilename}`}
                                    alt={`Перегляд ${originalIndex + 1}`}
                                    className={originalIndex === currentImageIndex ? 'active' : ''}
                                    onClick={() => handleSmallImageClick(originalIndex)}
                                    onError={(e) => {
                                        console.error(`Помилка завантаження малої картинки: ${url}/images/${imgFilename}`);
                                        e.target.style.visibility = 'hidden'; // Ховаємо при помилці
                                    }}
                                />
                            );
                        })}
                </div>

                {/* Main Image Container */}
                <div className="main-image" onClick={handleMainImageClick}>
                    {/* The actual image */}
                    {/* Перевіряємо, чи є ім'я файлу для поточного індексу */}
                    {currentImageFilename ? (
                        <img
                            // === ВИПРАВЛЕННЯ: Додаємо url + "/images/" ===
                            src={`${url}/images/${currentImageFilename}`}
                            alt="Основний вигляд"
                            onError={(e) => {
                                console.error(`Помилка завантаження головної картинки: ${url}/images/${currentImageFilename}`);
                                // Можна показати заглушку при помилці
                                e.target.style.display = 'none'; // Приховати зламане зображення
                                // Показати заглушку (потрібно додати її в JSX)
                            }}
                        />
                        // Тут можна додати JSX для заглушки, якщо треба
                        // <div style={{ display: 'none' /* Показати, якщо img приховано */ }}>Не вдалося завантажити фото</div>
                    ) : (
                        <div style={{ /* Styles for placeholder */ }}>Фото відсутнє</div>
                    )}

                    {/* Wishlist Button - Placed OVER the image */}
                    {/* MODIFICATION: Pass event to onClick */}
                    <button
                        onClick={handleToggleFavorite}
                        className="wishlist-button-over-image"
                        // ЗМІНЕНО: aria-label та fill тепер використовують isCurrentProductFavorited
                        aria-label={isCurrentProductFavorited ? "Видалити з обраного" : "Додати в обране"}
                    >
                        <svg
                            width="24" height="24" viewBox="0 0 24 24"
                            // ЗМІНЕНО: fill тепер використовує isCurrentProductFavorited
                            fill={isCurrentProductFavorited ? "#991313" : "transparent"}
                            stroke="black" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>
                        </svg>
                    </button>

                    {/* Quantity Controls */}
                    {/* {currentQuantityInCart > 0 && (
                        <div className="quantity-controls-over-image">
                            <button className="quantity-btn minus" onClick={handleRemoveFromCart} aria-label="Зменшити кількість">
                                <FaMinus size={10} style={{ display: 'block' }}/>
                            </button>
                            <span className="quantity-display-over-image">{currentQuantityInCart}</span>
                            <button className="quantity-btn plus" onClick={handleAddToCartWrapper} aria-label="Збільшити кількість">
                                <FaPlus size={10} style={{ display: 'block' }} />
                            </button>
                        </div>
                    )} */}
                </div> {/* End of .main-image */}

            </div> {/* --- End .product-images-container --- */}

            {/* Product Info Block */}
            <div className="product-info">
                <h4 className="product-title">{product.name}</h4>
                <div className="price">
                    {product.discount && product.price ? (<> <span className="old-price" style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5em' }}> {product.price} грн </span> <span className="new-price" style={{ color: '#dc2626', fontWeight: 'bold' }}> {Math.round(product.price * (1 - product.discount / 100))} грн </span> </>) : (<span>{product.price ? `${product.price} грн` : 'Ціна не вказана'}</span>)}
                </div>
                {/* БЛОК ВИБОРУ РОЗМІРУ */}
                {/* === БЛОК ВИБОРУ РОЗМІРУ ТА ТАБЛИЦІ РОЗМІРІВ - ОНОВЛЕНО === */}
                {product.sizes && product.sizes.length > 0 && (
                    <div className="my-4"> {/* головний контейнер для цього блоку */}
                        {/* Ліва частина: "Оберіть розмір" + кнопки розмірів або повідомлення */}
                        <div className="size-selection"> {/*клас */}
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Оберіть розмір:</h5>

                            {(() => {
                                const availableSizes = product.sizes.filter(sizeObj => sizeObj.quantity > 0);

                                if (availableSizes.length > 0) {
                                    // Якщо є доступні розміри, показуємо кнопки
                                    return (
                                        <div className="size-options-text flex flex-wrap gap-3 max-w-xs sm:max-w-none"> {/* Ваші класи */}
                                            {availableSizes.map((sizeObj) => (
                                                <button
                                                    key={sizeObj.size}
                                                    onClick={() => setSelectedSize(sizeObj.size)}
                                                    className={`
                                                        min-w-[36px] px-3 py-1.5 border rounded-md text-xs sm:px-4 sm:py-2 sm:text-sm font-medium transition-all duration-150 ease-in-out
                                                        focus:outline-none focus:ring-2 focus:ring-offset-1
                                                        ${selectedSize === sizeObj.size
                                                            ? 'bg-slate-800 text-white border-slate-800 focus:ring-slate-500'
                                                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50 focus:ring-blue-500'}
                                                        hover:shadow-sm 
                                                    `}
                                                    title={`Обрати розмір ${sizeObj.size}`}
                                                >
                                                    {sizeObj.size}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                } else {
                                    // Якщо розміри були, але жодного немає в наявності
                                    return (
                                        // Повідомлення виводиться всередині контейнера size-options-text
                                        // щоб зберегти відступи, якщо вони там були
                                        <div className="size-options-text">
                                            <p className="text-sm text-red-600 font-medium">Немає в наявності</p> {/* Червоний колір і жирний шрифт */}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                )}
                {/* КНОПКА "ДОДАТИ В КОШИК" - ОНОВЛЮЄМО ЇЇ onClick */}
                <div className="add-to-cart-action mt-4 mb-4">
                    <button
                        className={`select-size-btn w-full bg-[#54A5D9] hover:bg-[#4389b9] text-white font-medium py-3 rounded-md transition-colors duration-200 text-base`}
                        onClick={handleAddToCartClick} // Викликаємо нашу нову функцію
                     
                    >
                        Додати в кошик
                    </button>
                </div>
                <a href="#size-guide" className="size-guide-link">Таблиця розмірів</a> <div className="divider-line"></div>
                <a href="#try-on" className="try-on-link">Спробувати на собі</a> <div className="divider-line"></div>
                <div className="product-details-tabs">
                    <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')} > Про товар </button>
                    <button className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')} > Коментарі </button>
                    <div className={`tab-underline ${activeTab === 'description' ? 'visible' : ''}`}></div>
                </div>
                {activeTab === 'description' && (<div className="product-description" style={scrollableStyle} > <ProductDescription product={product} /> </div>)}
                {activeTab === 'comments' && (
                    <div className="product-description" style={scrollableStyle}>
                        {/* Передаємо productId та url */}
                        <ProductComments productId={product?._id} />
                        {/* Примітка: url має бути доступним тут, імовірно з ShopContext,
             але ProductComments сам дістає його з контексту, тож явно передавати не обов'язково,
             якщо він правильно налаштований в ProductComments */}
                    </div>
                )}
            </div> {/* --- End .product-info --- */}
        </section>
    );
};

export default ProductMd;
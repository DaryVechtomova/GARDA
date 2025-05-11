import React, { useState, useContext, useEffect, useCallback } from "react";
//import { FaMinus as Fa6Minus, FaPlus as Fa6Plus } from "react-icons/fa6"; // Перейменував, щоб уникнути конфлікту, якщо вони є і в fa

// Основні іконки Font Awesome (v5 або загальні)
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageIndexInModal, setSelectedImageIndexInModal] = useState(0);

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

    const MAX_MODAL_THUMBNAILS = 5;

    // Перевіряємо наявність 'url' навіть якщо продукт є
    if (!url) {
        console.error("ShopContext не надав 'url'");
        // Можна показати помилку або повернути null/заглушку
        return <div>Помилка завантаження: відсутній базовий URL.</div>;
    }

    const totalImages = product.images.length;
    const numberOfVisibleSmallImages = totalImages > 1 ? Math.min(2, totalImages - 1) : 0;
    // newVisibleStartIndex = Math.max(0, Math.min(newVisibleStartIndex, totalImages - numberOfVisibleSmallImages));

    // --- Розрахунки розмірів слайдера (ваш код) ---
    // ... (залишаємо ваш код для sliderTrackHeight, etc.) ...
    let sliderTrackHeight = 290; let sliderThumbHeight = 44; let sliderTrackElementTop = 97; let sliderTrackOffsetWithinControls = sliderTrackElementTop - 40; if (typeof window !== 'undefined') { const screenWidth = window.innerWidth; if (screenWidth >= 320 && screenWidth <= 450) { sliderTrackHeight = 161; sliderThumbHeight = 24; sliderTrackElementTop = 62; sliderTrackOffsetWithinControls = sliderTrackElementTop; } else if (screenWidth >= 451 && screenWidth <= 999) { sliderTrackHeight = 290; sliderThumbHeight = 44; sliderTrackElementTop = 188; sliderTrackOffsetWithinControls = 188 - 131; } else if (screenWidth >= 1000 && screenWidth <= 1439) { sliderTrackHeight = 249; sliderThumbHeight = 38; sliderTrackElementTop = 102; sliderTrackOffsetWithinControls = 102 - 53; } else { sliderTrackHeight = 290; sliderThumbHeight = 44; sliderTrackElementTop = 97; sliderTrackOffsetWithinControls = 97 - 40; } }

    // --- useEffect для видимих картинок (ваш код) ---
    useEffect(() => {
        // Тепер numberOfVisibleSmallImages визначена
        if (totalImages <= 1 || totalImages <= numberOfVisibleSmallImages) {
            setVisibleStartIndex(0);
            return;
        }

        let newVisibleStartIndex = visibleStartIndex;
        const currentEndVisibleIndex = visibleStartIndex + numberOfVisibleSmallImages - 1;

        if (sliderIndex < visibleStartIndex) {
            newVisibleStartIndex = sliderIndex;
        } else if (sliderIndex > currentEndVisibleIndex) {
            newVisibleStartIndex = sliderIndex - numberOfVisibleSmallImages + 1;
        }

        // Розрахунок верхньої межі для newVisibleStartIndex
        // Якщо totalImages = 3, numberOfVisibleSmallImages = 2, то maxStartIndex = 3 - 2 = 1.
        // Це означає, що visibleStartIndex може бути 0 або 1.
        const maxStartIndex = Math.max(0, totalImages - numberOfVisibleSmallImages);
        newVisibleStartIndex = Math.max(0, Math.min(newVisibleStartIndex, maxStartIndex));

        if (newVisibleStartIndex !== visibleStartIndex) {
            setVisibleStartIndex(newVisibleStartIndex);
        }
    }, [sliderIndex, visibleStartIndex, totalImages, numberOfVisibleSmallImages]);


    // Обробники навігації головним зображенням (також оновлюють sliderIndex)
    const handlePrevImage = () => {
        if (totalImages <= 1) return;
        const newIndex = currentImageIndex === 0 ? totalImages - 1 : currentImageIndex - 1;
        setCurrentImageIndex(newIndex);
        setSliderIndex(newIndex); // Синхронізуємо повзунок
    };
    const handleNextImage = () => {
        if (totalImages <= 1) return;
        const newIndex = currentImageIndex === totalImages - 1 ? 0 : currentImageIndex + 1;
        setCurrentImageIndex(newIndex);
        setSliderIndex(newIndex); // Синхронізуємо повзунок
    };
    // Клік на маленьке зображення
    const handleSmallImageClick = (index) => {
        if (index >= 0 && index < totalImages) {
            setCurrentImageIndex(index);
            setSliderIndex(index); // Синхронізуємо повзунок
        }
    };
    // // --- Обробники (код з stopPropagation) ---
    // const handlePrevImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === 0 ? totalImages - 1 : sliderIndex - 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    // const handleNextImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === totalImages - 1 ? 0 : sliderIndex + 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    // const handleSmallImageClick = (index) => { if (index >= 0 && index < totalImages) { setCurrentImageIndex(index); setSliderIndex(index); } };
    // const handleMainImageClick = () => { if (url + "/images/" + product.images[currentImageIndex]) { window.open(url + "/images/" + product.images[currentImageIndex], '_blank'); } };

    // --- Функції для модального вікна зображень ---
    const openImageModal = (startIndex = 0) => {
        setSelectedImageIndexInModal(startIndex);
        setIsImageModalOpen(true);
    };

    const closeImageModal = useCallback(() => { // useCallback для useEffect
        setIsImageModalOpen(false);
    }, []);

    const navigateModalImage = (direction) => {
        let newIndex = selectedImageIndexInModal;
        if (direction === 'prev') {
            newIndex = newIndex === 0 ? totalImages - 1 : newIndex - 1;
        } else {
            newIndex = newIndex === totalImages - 1 ? 0 : newIndex + 1;
        }
        setSelectedImageIndexInModal(newIndex);
    };

    const handleModalThumbnailClick = (index) => {
        setSelectedImageIndexInModal(index);
    };

    // Обробник кліку на головному зображенні - тепер відкриває модальне вікно
    const handleMainImageClick = () => {
        openImageModal(currentImageIndex);
    };

    // Закриття модального вікна по Esc
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeImageModal();
            }
        };
        if (isImageModalOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isImageModalOpen, closeImageModal]);

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



    // URL віртуальної примірочної (можна винести в конфігураційний файл або .env)
    const fittingRoomUrl = "http://localhost:5175";
    const handleTryOn = (event) => {
        event.preventDefault();
        window.open(fittingRoomUrl, '_blank');
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

    let imagesToDisplayInSmallSlider = [];
    if (totalImages > 1 && numberOfVisibleSmallImages > 0) {
        // Ми завжди хочемо показати numberOfVisibleSmallImages мініатюр, якщо це можливо
        // (не враховуючи поточне головне зображення)

        // Створюємо масив індексів, виключаючи поточний головний
        const availableIndexes = product.images
            .map((_, i) => i)
            .filter(i => i !== currentImageIndex);

        if (availableIndexes.length <= numberOfVisibleSmallImages) {
            // Якщо доступних менше або дорівнює, показуємо всі доступні
            imagesToDisplayInSmallSlider = availableIndexes.map(index => ({
                filename: product.images[index],
                originalIndex: index
            }));
        } else {
            // Якщо доступних більше, нам потрібно вибрати "вікно"
            // Спробуємо центрувати навколо поточного `currentImageIndex` (але його самого не включати)
            // або просто брати наступні/попередні

            // Простий підхід: беремо наступні, зациклюючись
            let startIndex = (currentImageIndex + 1) % totalImages;
            for (let i = 0; i < numberOfVisibleSmallImages; i++) {
                // Пропускаємо, якщо індекс збігається з поточним головним
                // (це може статися, якщо numberOfVisibleSmallImages велике і ми обійшли коло)
                let attempts = 0;
                while (startIndex === currentImageIndex && attempts < totalImages) {
                    startIndex = (startIndex + 1) % totalImages;
                    attempts++;
                }
                if (attempts < totalImages) { // Якщо знайшли не поточний індекс
                    imagesToDisplayInSmallSlider.push({
                        filename: product.images[startIndex],
                        originalIndex: startIndex
                    });
                }
                startIndex = (startIndex + 1) % totalImages;
            }
        }
    }

    return (
        <> {/* Обгортаємо все у Fragment, щоб додати модальне вікно поруч */}
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

                    {/* <div className="small-images">
                        {product.images
                            .filter((_, index) => index !== currentImageIndex)
                            .slice(visibleStartIndex, visibleStartIndex + numberOfVisibleSmallImages)
                            .map((imgFilename) => { // Перейменовано змінну для ясності
                                // const originalIndex = visibleStartIndex + indexInSlice;
                                // // Перевірка, чи ім'я файлу не порожнє
                                // if (!imgFilename) return null; // Пропускаємо, якщо ім'я файлу відсутнє
                                const originalIndex = product.images.findIndex(originalImg => originalImg === imgFilename);
                                if (originalIndex === -1 || !imgFilename) return null;
                                return (
                                    <img
                                        key={`main-thumb-${originalIndex}`}
                                        // === ВИПРАВЛЕННЯ: Додаємо url + "/images/" ===
                                        src={`${url}/images/${imgFilename}`}
                                        alt={`Перегляд ${originalIndex + 1}`}
                                        // className={originalIndex === currentImageIndex ? 'active' : ''}
                                        className={originalIndex === sliderIndex ? 'semi-active-thumb' : ''}
                                        onClick={() => handleSmallImageClick(originalIndex)}
                                        onError={(e) => {
                                            console.error(`Помилка завантаження малої картинки: ${url}/images/${imgFilename}`);
                                            e.target.style.visibility = 'hidden'; // Ховаємо при помилці
                                        }}
                                    />
                                );
                            })}
                    </div> */}

                    {totalImages > 1 && numberOfVisibleSmallImages > 0 && (
                        <div className="small-images">
                            {imagesToDisplayInSmallSlider.map((imgData) => {
                                if (!imgData.filename) return null;
                                return (
                                    <img
                                        key={`main-thumb-${imgData.originalIndex}`}
                                        src={`${url}/images/${imgData.filename}`}
                                        alt={`Перегляд ${imgData.originalIndex + 1}`}
                                        // Підсвічуємо, якщо це зображення, на яке вказує повзунок (але воно не головне)
                                        className={imgData.originalIndex === sliderIndex ? 'semi-active-thumb' : ''}
                                        onClick={() => handleSmallImageClick(imgData.originalIndex)}
                                        onError={(e) => { e.target.style.visibility = 'hidden'; }}
                                    />
                                );
                            })}
                        </div>
                    )}

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
                                            <div className="size-options-text flex flex-wrap gap-2 sm:gap-3 max-w-full"> {/* Ваші класи */}
                                                {availableSizes.map((sizeObj) => (
                                                    <button
                                                        key={sizeObj.size}
                                                        onClick={() => setSelectedSize(sizeObj.size)}
                                                        className={`
                                                        min-w-[30px]      // Твоя мінімальна ширина
                                                        px-1 py-1.5       // Твої менші паддінги для базового розміру
                                                        border 
                                                        rounded-md 
                                                        text-xs           // Твій розмір тексту для базового розміру
                                                        
                                                        // Стилі для sm екранів (можна також зменшити, якщо потрібно)
                                                        sm:min-w-[30px]   // Трохи більша мін. ширина для sm
                                                        sm:px-2 sm:py-1   // Трохи більші паддінги для sm
                                                        sm:text-xs        // Можна залишити text-xs або повернути sm:text-sm, якщо вміщається

                                                        font-medium 
                                                        transition-all duration-150 ease-in-out
                                                    
                                                        ${selectedSize === sizeObj.size
                                                                ? 'bg-slate-800 text-white  '
                                                                : 'bg-white text-slate-700  hover:border-slate-500 hover:bg-slate-50 '}
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
                                            <div className="size-options-text flex flex-wrap gap-2 sm:gap-3 max-w-full">
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
                    <button
                        onClick={handleTryOn}
                        className="try-on-link" // Залишай свої класи для стилізації
                    >
                        Спробувати на собі
                    </button>
                    <div className="divider-line">

                    </div>

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
            </section >
            {/* --- Модальне вікно для зображень --- */}
            {isImageModalOpen && product.images && product.images.length > 0 && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4"
                    onClick={closeImageModal} // Закриття по кліку на фон
                >
                    <button
                        className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-50"
                        onClick={(e) => { e.stopPropagation(); closeImageModal(); }} // Зупиняємо спливання, щоб не закривалось при кліку на кнопку
                        aria-label="Закрити"
                    >
                        <FaTimes />
                    </button>

                    <div
                        className="relative flex items-center justify-center w-full max-w-3xl max-h-[80vh]" // Обмежуємо розмір великого фото
                        onClick={(e) => e.stopPropagation()} // Зупиняємо спливання, щоб не закривалось при кліку на саме фото
                    >
                        {totalImages > 1 && (
                            <button
                                className="absolute left-0 sm:-left-12 text-white text-4xl hover:text-gray-300 p-2 z-10"
                                onClick={() => navigateModalImage('prev')}
                                aria-label="Попереднє зображення"
                            >
                                <FaChevronLeft />
                            </button>
                        )}

                        <img
                            src={`${url}/images/${product.images[selectedImageIndexInModal]}`}
                            alt={`Зображення ${selectedImageIndexInModal + 1}`}
                            className="max-w-full max-h-full object-contain rounded-md"
                        />

                        {totalImages > 1 && (
                            <button
                                className="absolute right-0 sm:-right-12 text-white text-4xl hover:text-gray-300 p-2 z-10"
                                onClick={() => navigateModalImage('next')}
                                aria-label="Наступне зображення"
                            >
                                <FaChevronRight />
                            </button>
                        )}
                    </div>

                    {/* Мініатюри під великим зображенням */}
                    {totalImages > 1 && (
                        <div
                            className="flex justify-center items-center gap-2 mt-4 overflow-x-auto p-2 max-w-full"
                            onClick={(e) => e.stopPropagation()} // Зупиняємо спливання
                        >
                            {product.images.map((imgFilename, index) => {
                                // Не показуємо мініатюру, якщо це поточне велике зображення
                                if (index === selectedImageIndexInModal) {
                                    return null;
                                }
                                // Обмежуємо кількість видимих мініатюр (опціонально, для кращого вигляду)
                                // Простий варіант: показуємо всі, крім поточної
                                // Складніший: показуємо обмежену кількість навколо поточної
                                // Тут реалізовано простий варіант

                                // Для обмеженої кількості:
                                // const diff = Math.abs(index - selectedImageIndexInModal);
                                // const halfWay = Math.floor(MAX_MODAL_THUMBNAILS / 2);
                                // if (diff > halfWay && totalImages > MAX_MODAL_THUMBNAILS) return null;


                                return (
                                    <img
                                        key={`modal-thumb-${index}`}
                                        src={`${url}/images/${imgFilename}`}
                                        alt={`Мініатюра ${index + 1}`}
                                        className={`w-16 h-16 object-cover rounded cursor-pointer border-2 transition-all
                                            ${index === selectedImageIndexInModal ? 'border-blue-500 opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`
                                        }
                                        onClick={() => handleModalThumbnailClick(index)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ProductMd;
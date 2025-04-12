import React, { useState, useContext, useEffect } from "react";
import { FaMinus, FaPlus } from "react-icons/fa6"; // Використовуємо FaHeart, якщо потрібно
import { FaHeart } from "react-icons/fa"; // Додайте імпорт для серця
import { ShopContext } from "../context/ShopContext";
import { useNavigate } from "react-router-dom";
import ArrowIcon from '../assets/design/Arrow.png'; // Переконайтесь, що шлях правильний
import ProductDescription from '../components/ProductDescription';

const ProductMd = ({ product }) => {
    // Переконайтесь, що 'url' отримується з контексту
    const { cartItems, addToCart, removeFromCart, url } = useContext(ShopContext);
    const navigate = useNavigate();

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sliderIndex, setSliderIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('description');
    const [visibleStartIndex, setVisibleStartIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false); // Якщо ви використовуєте логіку сердечка

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

    // --- Обробники (ваш код з stopPropagation) ---
    const handlePrevImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === 0 ? totalImages - 1 : sliderIndex - 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    const handleNextImage = () => { if (totalImages <= 1) return; const newIndex = sliderIndex === totalImages - 1 ? 0 : sliderIndex + 1; setSliderIndex(newIndex); setCurrentImageIndex(newIndex); };
    const handleSmallImageClick = (index) => { if (index >= 0 && index < totalImages) { setCurrentImageIndex(index); setSliderIndex(index); } };
    const handleMainImageClick = () => { if(url+"/images/"+product.images[currentImageIndex]){ window.open(url+"/images/"+product.images[currentImageIndex], '_blank'); } };
    const handleToggleFavorite = (event) => { event.stopPropagation(); setIsFavorited(!isFavorited); console.log("Перемкнули Обране для товару:", product._id); };
    const handleRemoveFromCart = (event) => { event.stopPropagation(); removeFromCart(product._id); }
    const handleAddToCart = (event) => { event.stopPropagation(); addToCart(product._id); }



    const sizeListText = product.sizes?.map(sizeObj => sizeObj.size).join(' ') || 'Немає';
    const thumbTopWithinTrack = totalImages > 1 ? (sliderTrackHeight - sliderThumbHeight) * (sliderIndex / (totalImages - 1)) : 0;
    const currentQuantityInCart = cartItems[product._id] || 0;

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
                         <button className="slider-arrow up-arrow" onClick={handlePrevImage} aria-label="Previous image"><img src={ArrowIcon} alt="Up"/></button>
                         <div className="slider-track"><div className="slider-thumb" style={{ top: `${thumbTopWithinTrack}px` }}></div></div>
                         <button className="slider-arrow down-arrow" onClick={handleNextImage} aria-label="Next image"><img src={ArrowIcon} alt="Down"/></button>
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
                    onClick={handleToggleFavorite} // Use the modified handler
                    className="wishlist-button-over-image" // Use the specific class for CSS positioning
                    aria-label={isFavorited ? "Видалити з обраного" : "Додати в обране"}
                >
                    {/* SVG remains the same */}
                     <svg
                        width="24" height="24" viewBox="0 0 24 24"
                        fill={isFavorited ? "#991313" : "transparent"}
                        stroke="black" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>
                    </svg>
                </button>

                    {/* Quantity Controls */}
                    {currentQuantityInCart > 0 && (
                        <div className="quantity-controls-over-image">
                            <button className="quantity-btn minus" onClick={handleRemoveFromCart} aria-label="Зменшити кількість">
                                <FaMinus size={10} style={{ display: 'block' }}/>
                            </button>
                            <span className="quantity-display-over-image">{currentQuantityInCart}</span>
                            <button className="quantity-btn plus" onClick={handleAddToCart} aria-label="Збільшити кількість">
                                <FaPlus size={10} style={{ display: 'block' }} />
                            </button>
                        </div>
                    )}
                </div> {/* End of .main-image */}

            </div> {/* --- End .product-images-container --- */}

            {/* Product Info Block */}
            <div className="product-info">
                <h4 className="product-title">{product.name}</h4>
                <div className="price">
                     {product.discount && product.price ? ( <> <span className="old-price" style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5em' }}> {product.price} грн </span> <span className="new-price" style={{ color: '#dc2626', fontWeight: 'bold' }}> {Math.round(product.price * (1 - product.discount / 100))} грн </span> </> ) : ( <span>{product.price ? `${product.price} грн` : 'Ціна не вказана'}</span> )}
                </div>
                <div className="size-selection">
                     <h5>Оберіть розмір:</h5>
                     <div className="size-options-text">{sizeListText}</div>
                     <button className="select-size-btn" onClick={() => { if (currentQuantityInCart === 0) { addToCart(product._id); } else { console.log("Товар вже в кошику. Використовуйте +/- для зміни кількості."); } }} > Додати в кошик </button>
                </div>
                 <a href="#size-guide" className="size-guide-link">Таблиця розмірів</a> <div className="divider-line"></div>
                 <a href="#try-on" className="try-on-link">Спробувати на собі</a> <div className="divider-line"></div>
                 <div className="product-details-tabs">
                     <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')} > Про товар </button>
                     <button className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')} > Коментарі </button>
                     <div className={`tab-underline ${activeTab === 'description' ? 'visible' : ''}`}></div>
                  </div>
                 {activeTab === 'description' && ( <div className="product-description"   style={scrollableStyle} > <ProductDescription product={product} /> </div> )}
                 {activeTab === 'comments' && ( <div className="product-comments"    style={scrollableStyle}> <p>Коментарі поки що не доступні.</p> </div> )}
            </div> {/* --- End .product-info --- */}
        </section>
    );
};

export default ProductMd;
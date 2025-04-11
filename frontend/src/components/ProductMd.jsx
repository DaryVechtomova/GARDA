import React, { useState, useContext, useEffect } from "react";
import { FaHeart } from "react-icons/fa6";
import { ShopContext } from "../context/ShopContext"; 
import { useNavigate } from "react-router-dom"; 
import ArrowIcon from '../assets/design/Arrow.png';

const ProductMd = ({ product }) => {
  const { addToCart, cartItems } = useContext(ShopContext); 
  const navigate = useNavigate(); 

  // Стан для індексу головного зображення (змінюється ТІЛЬКИ при кліку на маленьке)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // === НОВИЙ СТАН: для індексу повзунка/стрілок ===
  const [sliderIndex, setSliderIndex] = useState(0);
  // ----------------------------------------------
  const [activeTab, setActiveTab] = useState('description');
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);

  if (!product || !product.images || product.images.length === 0) {
    return <div>Loading product details...</div>;
  }

  const totalImages = product.images.length;
  const numberOfVisibleSmallImages = 2;
  const sliderTrackHeight = 210;
  const sliderThumbHeight = 20; 
  const sliderTrackTopOffset = 10;

  // === useEffect: ОНОВЛЮЄМО ВИДИМІ КАРТИНКИ БАЗУЮЧИСЬ НА sliderIndex ===
  useEffect(() => {
    if (totalImages <= numberOfVisibleSmallImages) {
      setVisibleStartIndex(0);
      return;
    }
    let newVisibleStartIndex = visibleStartIndex;
    const currentEndVisibleIndex = visibleStartIndex + numberOfVisibleSmallImages - 1;

    // Логіка тепер залежить від sliderIndex, не currentImageIndex
    if (sliderIndex < visibleStartIndex) {
      newVisibleStartIndex = sliderIndex;
    } else if (sliderIndex > currentEndVisibleIndex) {
      newVisibleStartIndex = sliderIndex - numberOfVisibleSmallImages + 1;
    }

    newVisibleStartIndex = Math.max(0, Math.min(newVisibleStartIndex, totalImages - numberOfVisibleSmallImages));

    if (newVisibleStartIndex !== visibleStartIndex) {
      setVisibleStartIndex(newVisibleStartIndex);
    }
    // Залежність тепер від sliderIndex
  }, [sliderIndex, visibleStartIndex, totalImages]);
  // -------------------------------------------------------------


  // === ОБРОБНИКИ ПОДІЙ СТРІЛОК: Змінюють ТІЛЬКИ sliderIndex ===
  const handlePrevImage = () => {
    if (totalImages <= 1) return;
    setSliderIndex(prev => prev === 0 ? totalImages - 1 : prev - 1);
  };

  const handleNextImage = () => {
    if (totalImages <= 1) return;
    setSliderIndex(prev => prev === totalImages - 1 ? 0 : prev + 1);
  };
  // -------------------------------------------------------------


  // === ОБРОБНИК КЛІКУ НА МАЛЕНЬКІ: Змінює ОБИДВА індекси ===
  const handleSmallImageClick = (index) => {
      if (index >= 0 && index < totalImages) {
          setCurrentImageIndex(index); // Оновлюємо головне зображення
          setSliderIndex(index);       // Синхронізуємо повзунок/стрілки
      }
  };
  // ----------------------------------------------------------


  const handleMainImageClick = () => {
    if(product.images[currentImageIndex]){
      window.open(product.images[currentImageIndex], '_blank');
    }
  };

  const sizeListText = product.sizes?.map(sizeObj => sizeObj.size).join(' ') || 'N/A';

  // === Розрахунок позиції повзунка: БАЗУЄТЬСЯ НА sliderIndex ===
  const thumbTopPosition = totalImages > 1
    ? sliderTrackTopOffset + (sliderTrackHeight - sliderThumbHeight) * (sliderIndex / (totalImages - 1))
    : sliderTrackTopOffset;
  // ------------------------------------------------------------


  return (
    <section className="product-container ProductMd-section">
      <div className="flowers-left"></div>
      <div className="flowers-right"></div>

      <div className="product-images-container">
  
        {totalImages > 1 && (
            <div className="slider-controls">
              {/* Стрілки тепер викликають handlePrev/Next, що змінює sliderIndex */}
              <button className="slider-arrow up-arrow" onClick={handlePrevImage} aria-label="Previous image">
                <img src={ArrowIcon} alt="Up"/>
              </button>
              <div className="slider-track">
                <div
                    className="slider-thumb"
                    /* Позиція тепер залежить від sliderIndex */
                    style={{ top: `${thumbTopPosition}px` }}
                ></div>
              </div>
              <button className="slider-arrow down-arrow" onClick={handleNextImage} aria-label="Next image">
                 <img src={ArrowIcon} alt="Down"/>
              </button>
            </div>
         )}

        {/* Маленькі зображення: рендеряться на основі visibleStartIndex (який залежить від sliderIndex) */}
        <div className="small-images">
          {product.images
            .slice(visibleStartIndex, visibleStartIndex + numberOfVisibleSmallImages)
            .map((img, indexInSlice) => {
              const originalIndex = visibleStartIndex + indexInSlice;
              return (
                <img
                  key={originalIndex}
                  src={img}
                  alt={`View ${originalIndex + 1}`}
                  /* Клас 'active' все ще залежить від currentImageIndex, щоб підсвітити головну */
                  className={originalIndex === currentImageIndex ? 'active' : ''}
                  /* Клік на маленьке змінює І currentImageIndex І sliderIndex */
                  onClick={() => handleSmallImageClick(originalIndex)}
                  onError={(e) => e.target.style.visibility = 'hidden'}
                />
              );
          })}
        </div>

        {/* Головне зображення: Залежить тільки від currentImageIndex */}
        <div className="main-image" onClick={handleMainImageClick}>
          <img src={product.images[currentImageIndex]} alt="Main view" />
        </div>

        <button className="wishlist-btn" aria-label="Add to wishlist"> <FaHeart /> </button>
      </div>

      {/* --- БЛОК ІНФОРМАЦІЇ ПРО ТОВАР --- */}
      {/* (Залишено як було, оскільки запит стосувався тільки зображень) */}
      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>
        <div className="price">
          {/* ... код ціни ... */}
           {product.discount && product.price ? (
             <>
               <span className="old-price" style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5em' }}>
                 {product.price} грн
               </span>
               <span className="new-price" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  {Math.round(product.price * (1 - product.discount / 100))} грн
               </span>
             </>
           ) : (
             <span>{product.price} грн</span>
           )}
        </div>
        <div className="size-selection">
          <h5>Оберіть розмір:</h5>
           <div className="size-options-text">{sizeListText}</div>
           <button className="select-size-btn">Обрати розмір</button>
        </div>
         <a href="#size-guide" className="size-guide-link" onClick={(e) => e.preventDefault()}>Таблиця розмірів</a>
         <div className="divider-line"></div>
         <a href="#try-on" className="try-on-link" onClick={(e) => e.preventDefault()}>Спробувати на собі</a>
         <div className="divider-line"></div>
        <div className="product-details-tabs">
          <button
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          > Про товар </button>
          <button
             className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
             onClick={() => setActiveTab('comments')}
          > Коментарі </button>
           {activeTab === 'description' && <div className="tab-underline"></div>}
        </div>
        {activeTab === 'description' && (
          <div className="product-description">
             <p>Тканина - {product.fabric || 'не вказано'}</p>
             <p>Техніка виконання - {product.technique || 'не вказано'}</p>
             <p>Нитки - {product.threads || 'не вказано'}</p>
          </div>
        )}
        {activeTab === 'comments' && (
            <div className="product-comments"> <p>Коментарі поки що не доступні.</p> </div>
         )}
      </div>
    </section>
  );
};

export default ProductMd;
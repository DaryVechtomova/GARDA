import React, { useState, useContext, useEffect } from "react";
import { FaHeart } from "react-icons/fa6";
import { ShopContext } from "../context/ShopContext";
import { useNavigate } from "react-router-dom";
import ArrowIcon from '../assets/design/Arrow.png';

const ProductMd = ({ product }) => {
  const { addToCart, cartItems } = useContext(ShopContext);
  const navigate = useNavigate();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);

  if (!product || !product.images || product.images.length === 0) {
    return <div>Loading product details...</div>;
  }

  const totalImages = product.images.length;
  const numberOfVisibleSmallImages = 2;

  // --- ЗМІНА: Динамічні значення для повзунка ---
  // Визначаємо параметри повзунка ВЗАЛЕЖНОСТІ ВІД ШИРИНИ ЕКРАНУ
  // Ці значення будуть використані в розрахунку thumbTopPosition

  let sliderTrackHeight = 210; // Значення за замовчуванням (для екранів > 450px або < 320px?)
  let sliderThumbHeight = 20; // Значення за замовчуванням
  let sliderTrackTopOffset = 10; // Значення за замовчуванням

  // Перевіряємо ширину вікна ТІЛЬКИ на клієнті
  // typeof window !== 'undefined' запобігає помилкам при Server-Side Rendering (SSR)
  if (typeof window !== 'undefined') {
    const screenWidth = window.innerWidth;
    // Застосовуємо спеціальні значення для екранів від 320 до 450 пікселів
    if (screenWidth >= 320 && screenWidth <= 450) {
        sliderTrackHeight = 141; // Ваше значення для цього діапазону
        sliderThumbHeight = 20;  // Ваше значення (залишилось 20)
        sliderTrackTopOffset = 10; // Ваше значення (залишилось 10)
    }
     // Тут можна додати інші умови 'else if' для інших діапазонів, якщо потрібно
  }
  // --------------------------------------------------


  useEffect(() => {
    if (totalImages <= numberOfVisibleSmallImages) {
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

    newVisibleStartIndex = Math.max(0, Math.min(newVisibleStartIndex, totalImages - numberOfVisibleSmallImages));

    if (newVisibleStartIndex !== visibleStartIndex) {
      setVisibleStartIndex(newVisibleStartIndex);
    }
  }, [sliderIndex, visibleStartIndex, totalImages]); // numberOfVisibleSmallImages не змінюється, його не треба додавати


  const handlePrevImage = () => {
    if (totalImages <= 1) return;
    setSliderIndex(prev => prev === 0 ? totalImages - 1 : prev - 1);
  };

  const handleNextImage = () => {
    if (totalImages <= 1) return;
    setSliderIndex(prev => prev === totalImages - 1 ? 0 : prev + 1);
  };


  const handleSmallImageClick = (index) => {
      if (index >= 0 && index < totalImages) {
          setCurrentImageIndex(index);
          setSliderIndex(index);
      }
  };


  const handleMainImageClick = () => {
    if(product.images[currentImageIndex]){
      window.open(product.images[currentImageIndex], '_blank');
    }
  };

  const sizeListText = product.sizes?.map(sizeObj => sizeObj.size).join(' ') || 'N/A';


  // === Розрахунок позиції повзунка ===
  // ТЕПЕР ВИКОРИСТОВУЄ ДИНАМІЧНІ ЗНАЧЕННЯ sliderTrackHeight, sliderThumbHeight, sliderTrackTopOffset
  const thumbTopPosition = totalImages > 1
    ? sliderTrackTopOffset + (sliderTrackHeight - sliderThumbHeight) * (sliderIndex / (totalImages - 1))
    : sliderTrackTopOffset;
  // -------------------------------------


  return (
    // Решта JSX коду залишається БЕЗ ЗМІН...
    <section className="product-container ProductMd-section">
      <div className="flowers-left"></div>
      <div className="flowers-right"></div>

      <div className="product-images-container">

        {totalImages > 1 && (
            <div className="slider-controls">
              <button className="slider-arrow up-arrow" onClick={handlePrevImage} aria-label="Previous image">
                <img src={ArrowIcon} alt="Up"/>
              </button>
              <div className="slider-track">
                <div
                    className="slider-thumb"
                    style={{ top: `${thumbTopPosition}px` }} // Використовується розраховане значення
                ></div>
              </div>
              <button className="slider-arrow down-arrow" onClick={handleNextImage} aria-label="Next image">
                 <img src={ArrowIcon} alt="Down"/>
              </button>
            </div>
         )}

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
                  className={originalIndex === currentImageIndex ? 'active' : ''}
                  onClick={() => handleSmallImageClick(originalIndex)}
                  onError={(e) => e.target.style.visibility = 'hidden'} // onError залишено
                />
              );
          })}
        </div>

        <div className="main-image" onClick={handleMainImageClick}>
           {/* Перевірка на випадок якщо зображення немає */}
           {product.images[currentImageIndex] ? (
               <img src={product.images[currentImageIndex]} alt="Main view" />
            ) : (
               <div style={{ /* Стилі для плейсхолдера */ width: '100%', height: '100%', background: '#eee', display:'flex', alignItems:'center', justifyContent:'center'}}>No Image</div>
            )}
        </div>

        <button className="wishlist-btn" aria-label="Add to wishlist"> <FaHeart /> </button>
      </div>

      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>
        <div className="price">
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
             <span>{product.price ? `${product.price} грн` : 'Ціна не вказана'}</span>
           )}
        </div>
        <div className="size-selection">
          <h5>Оберіть розмір:</h5>
           <div className="size-options-text">{sizeListText}</div>
           <button className="select-size-btn">Обрати розмір</button> {/* TODO: Додати логіку */}
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
           {/* Підкреслення таба краще робити через CSS на базі класу .active */}
           <div className={`tab-underline ${activeTab === 'description' ? 'visible' : ''}`}></div>
        </div>
        {activeTab === 'description' && (
          <div className="product-description">
             <p>Тканина - {product.fabric || 'не вказано'}</p>
             <p>Техніка виконання - {product.technique || 'не вказано'}</p>
             <p>Нитки - {product.threads || 'не вказано'}</p>
             {/* Додаткова інформація, якщо є */}
             {/* <p>Опис: {product.description || 'немає'}</p> */}
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
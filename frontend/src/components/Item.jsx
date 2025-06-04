import React, { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { ShopContext } from "../context/ShopContext";

const Item = ({ product }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Локальний стан для isFavorited, який буде синхронізуватися з контекстом
  const [isFavoritedByContext, setIsFavoritedByContext] = useState(false);

  const contextValue = useContext(ShopContext);

  // Обережний доступ до значень контексту
  const cartItems = contextValue?.cartItems;
  const addToCart = contextValue?.addToCart;
  const removeFromCart = contextValue?.removeFromCart;
  const url = contextValue?.url;
  const wishlistItems = contextValue?.wishlistItems; // Має бути {} якщо не завантажено/немає токена
  const toggleWishlist = contextValue?.toggleWishlist;
  const token = contextValue?.token;

  // Синхронізація локального isFavoritedByContext зі станом з контексту
  useEffect(() => {
    if (product && product._id && wishlistItems) {
      // Перевіряємо, чи wishlistItems не порожній і чи містить ключ
      const favorited = !!(
        wishlistItems[product._id] && wishlistItems[product._id] > 0
      );
      setIsFavoritedByContext(favorited);
    } else {
      setIsFavoritedByContext(false); // За замовчуванням не в улюблених
    }
  }, [wishlistItems, product]); // Залежності: product та wishlistItems

  // Якщо контекст або основні функції не завантажені, показуємо заглушку
  if (
    !contextValue ||
    typeof addToCart !== "function" ||
    typeof toggleWishlist !== "function"
  ) {
    return <div>Завантаження...</div>;
  }

  // Якщо дані продукту ще не завантажені
  if (!product || !product._id || !product.images) {
    return <div>Інформація про товар завантажується...</div>;
  }

  const handleNextImage = () => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % product.images.length
      );
    }
  };

  const handlePreviousImage = () => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? product.images.length - 1 : prevIndex - 1
      );
    }
  };

  const handleToggleFavorite = () => {
    if (!token) {
      alert(
        "Будь ласка, увійдіть до акаунту, щоб додавати товари до обраного."
      );
      return;
    }
    if (product && product._id && toggleWishlist) {
      toggleWishlist(product._id);
    }
  };

  // Якщо URL не визначено, показуємо заглушку або повертаємо null
  if (!url) {
    console.warn("URL is not defined in ShopContext for Item component.");
    return <div>Помилка конфігурації: URL не знайдено.</div>;
  }

  return (
    <div
      className="item-container bg-[#FCFAF4] shadow-md rounded-[15px] p-4 flex flex-col justify-between relative"
      style={{ width: "370px", height: "571px" }}
    >
      <div className="relative">
        <button
          onClick={handlePreviousImage}
          className="absolute left-2 top-1/2 transform -translate-y-1/2"
          disabled={!product.images || product.images.length <= 1}
        >
          ◀
        </button>
        <Link to={`/product/${product._id}`}>
          <img
            src={
              product.images &&
              product.images.length > 0 &&
              product.images[currentImageIndex]
                ? `${url}/images/${product.images[currentImageIndex]}`
                : "placeholder.jpg"
            }
            alt={product.name || "Зображення товару"}
            style={{
              width: "100%",
              height: "400px",
              objectFit: "cover",
              borderRadius: "10px",
            }}
            className="border border-gray-500"
          />
        </Link>
        <button
          onClick={handleNextImage}
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          disabled={!product.images || product.images.length <= 1}
        >
          ▶
        </button>
      </div>
      <Link to={`/product/${product._id}`}>
        <div className="text-center mt-4">
          <h4
            style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
            className="font-semi-bold text-l mb-2"
          >
            {product.name || "Назва товару"}
          </h4>
          <div className="text-lg text-gray-800">
            <span
              style={{ fontFamily: "Montserrat Alternates", fontWeight: 500 }}
            >
              Ціна:
            </span>
            {typeof product.price === "number" ? (
              <span
                style={{ fontFamily: "Montserrat Alternates", fontWeight: 500 }}
                className="ml-2"
              >
                {typeof product.discount === "number" &&
                product.discount > 0 ? (
                  <>
                    <span
                      style={{
                        fontFamily: "Montserrat Alternates",
                        fontWeight: 500,
                      }}
                      className="line-through text-gray-500"
                    >
                      {product.price} грн
                    </span>
                    <br />
                    <span
                      style={{
                        fontFamily: "Montserrat Alternates",
                        fontWeight: 500,
                      }}
                      className="text-red-600 font-bold"
                    >
                      {Math.round(product.price * (1 - product.discount / 100))}{" "}
                      грн
                    </span>
                  </>
                ) : (
                  <>{product.price} грн</>
                )}
              </span>
            ) : (
              "Ціна не вказана"
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={handleToggleFavorite}
        className="absolute bottom-4 right-4"
        style={{
          fontSize: "2.5rem",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        aria-label={
          isFavoritedByContext ? "Видалити з обраного" : "Додати в обране"
        }
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill={isFavoritedByContext ? "#991313" : "transparent"} // Використовуємо локальний синхронізований стан
          stroke="black"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>
        </svg>
      </button>
    </div>
  );
};

export default Item;

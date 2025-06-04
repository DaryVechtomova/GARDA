import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Item from "../components/Item";
import { ShopContext } from "../context/ShopContext";
import Flower from "../assets/design/flower.png";

const Favorites = () => {
  const { all_products, wishlistItems, token } = useContext(ShopContext);
  const [wishlistedProducts, setWishlistedProducts] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // --- Відстеження ширини вікна (як у SearchPage) ---
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // --- Фільтрація товарів для відображення в Обраному ---
  useEffect(() => {
    // Перевіряємо, чи є завантажені всі товари та дані обраного
    if (all_products && wishlistItems) {
      // Отримуємо масив ID товарів, які є в wishlistItems
      // Переконайся, що wishlistItems має формат { "itemId": count } або { "itemId": true }
      // В коді контексту використовується {itemId: count}, де count > 0 означає наявність
      const wishlistedIds = Object.keys(wishlistItems).filter(
        (id) => wishlistItems[id] > 0
      );

      // Фільтруємо all_products, залишаючи тільки ті, що є в wishlistedIds
      const filteredProducts = all_products.filter(
        (product) => wishlistedIds.includes(product._id) // Переконайся, що ID товару називається _id
      );
      setWishlistedProducts(filteredProducts);
    } else {
      // Якщо дані ще не завантажені, список порожній
      setWishlistedProducts([]);
    }
  }, [all_products, wishlistItems]); // Перефільтровуємо, коли змінюється список товарів або обране

  // --- Лінійна інтерполяція для відступів (як у SearchPage) ---
  const interpolate = (value, x1, y1, x2, y2) => {
    return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
  };

  const calculateMarginTop = () => {
    const mobileMarginTop = 40;
    const desktopMarginTop = 80;
    return interpolate(
      windowWidth,
      600,
      mobileMarginTop,
      1540,
      desktopMarginTop
    );
  };

  // --- Перевірка авторизації ---
  // Якщо немає токена, показуємо повідомлення або перенаправляємо
  if (!token) {
    return (
      <section
        id="wishlist-page"
        className="max-w-screen-lg mx-auto py-16 min-h-[70vh] flex flex-col items-center justify-center"
        style={{
          marginTop: `${calculateMarginTop()}px`,
          paddingBottom: "100px",
        }}
      >
        <h2
          style={{ fontFamily: "Montserrat Alternates", fontWeight: 500 }}
          className="text-2xl font-bold mb-4 text-center"
        >
          Обране
        </h2>
        <p className="text-center text-lg mb-4">
          Будь ласка, увійдіть до свого облікового запису, щоб переглянути
          обрані товари.
        </p>
        <button
          onClick={() => navigate("/login")} // Або шлях до сторінки входу
          className="bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Увійти
        </button>
      </section>
    );
  }

  // --- Основний рендер сторінки ---
  return (
    <section
      id="wishlist-page"
      className="max-w-screen-lg mx-auto py-6 min-h-[70vh] flex flex-col"
      style={{
        marginTop: `${calculateMarginTop()}px`,
        paddingBottom: "100px", // Додаємо відступ знизу
      }}
    >
      {/* Заголовок сторінки з квітками */}
      <div className="flex items-center justify-center mb-2 md:mb-3">
        <img
          src={Flower}
          alt=""
          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain mr-2 sm:mr-3 md:mr-4 transform translate-y-[10px]"
        />
        <h2
          style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
          className="text-xl sm:text-2xl md:text-3xl text-center text-black"
        >
          Обране
        </h2>
        <img
          src={Flower}
          alt=""
          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain ml-2 sm:ml-3 md:ml-4 transform translate-y-[10px]"
        />
      </div>

      {/* Перевіряємо, чи є товари в обраному */}
      {wishlistedProducts.length > 0 ? (
        // Якщо є, відображаємо сітку товарів
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 xl:gap-x-8 flex-grow">
          {wishlistedProducts.map((product) => (
            <div key={product._id} className="flex justify-center">
              {/* Передаємо дані товару в компонент Item */}
              <Item product={product} />
            </div>
          ))}
        </div>
      ) : (
        // Якщо немає, показуємо повідомлення
        <div className="flex-grow flex items-center justify-center">
          <p className="text-center text-lg">Ваш список обраного порожній.</p>
        </div>
      )}
    </section>
  );
};

export default Favorites;

import React, { useState, useEffect, useContext } from "react";
import Item from "../components/Item";
import { ShopContext } from "../context/ShopContext";

const DiscountedProductsPage = () => {
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Стан для індикатора завантаження
  const [error, setError] = useState(null); // Стан для збереження помилки
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { url } = useContext(ShopContext);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Ефект для завантаження товарів зі знижкою при монтуванні компонента
  useEffect(() => {
    const fetchDiscountedProducts = async () => {
      setIsLoading(true); // Починаємо завантаження
      setError(null); // Скидаємо попередню помилку
      try {
        const response = await fetch(
          `${url}/api/product/list-discounted-products`
        );
        const data = await response.json();

        if (data.success) {
          // Дані з бекенду знаходяться у полі data.data
          setDiscountedProducts(data.data);
        } else {
          // Якщо бекенд повернув success: false
          throw new Error(
            data.message || "Не вдалося завантажити товари зі знижкою."
          );
        }
      } catch (err) {
        console.error("Помилка завантаження товарів зі знижкою:", err);
        setError(err.message); // Зберігаємо текст помилки для відображення
      } finally {
        setIsLoading(false); // Завершуємо завантаження (успішне чи з помилкою)
      }
    };

    fetchDiscountedProducts();
  }, [url]); // Залежність від url, щоб перезавантажити, якщо він зміниться

  // Лінійна інтерполяція для відступів (залишаємо як у SearchPage)
  const interpolate = (value, x1, y1, x2, y2) => {
    return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
  };

  // Розрахунок відступів (залишаємо як у SearchPage)
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

  return (
    <section
      id="discounted-products" // Змінено id
      className="max-w-screen-lg mx-auto py-16 min-h-[70vh] flex flex-col"
      style={{
        marginTop: `${calculateMarginTop()}px`,
        paddingBottom: "100px", // Відступ знизу
      }}
    >
      <h2
        style={{ fontFamily: "Montserrat Alternates", fontWeight: 500 }}
        className="text-3xl font-bold mb-8 text-center"
      >
        Акційні товари {/* Змінено заголовок */}
      </h2>

      {/* Умовний рендеринг: Завантаження -> Помилка -> Результати -> Немає товарів */}
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-center text-lg">Завантаження...</p>
          {/* Тут можна додати спіннер або інший індикатор */}
        </div>
      ) : error ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-center text-lg text-red-600">Помилка: {error}</p>
        </div>
      ) : discountedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-20 flex-grow">
          {discountedProducts.map((product) => (
            <div key={product._id} className="flex justify-center">
              {/* Передаємо весь об'єкт product, який містить price, discount, і discountedPrice */}
              <Item product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-center text-lg">Наразі немає акційних товарів.</p>{" "}
          {/* Змінено повідомлення */}
        </div>
      )}
    </section>
  );
};

export default DiscountedProductsPage;

// pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaShoppingCart,
  FaRegCalendarCheck,
  FaRegMoneyBillAlt,
  FaUsers,
  FaCalendarWeek,
  FaStar,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import Flower from "../assets/design/flower.png";

const API_URL = "http://localhost:4000";

const StatCard = ({ title, value, bgColor = "bg-blue-500", icon }) => {
  return (
    <div
      className={`
                p-4 ${bgColor} rounded-xl shadow-lg
                flex flex-col items-center justify-center
                h-48
                transition-all duration-300 ease-in-out hover:scale-105
                text-center text-white 
            `}
    >
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <h3 className="text-base font-semibold leading-snug mb-2">{title}</h3>
      <p className="text-2xl font-bold leading-snug text-white">{value}</p>
    </div>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    // Функція для завантаження основної статистики
    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/admin-stats/dashboard`
        );
        if (response.data.success) {
          setStats(response.data.data);
        } else {
          toast.error(
            response.data.message || "Помилка завантаження основної статистики"
          );
        }
      } catch (err) {
        console.error("DashboardPage fetchStats error:", err);
        if (err.response && err.response.data && err.response.data.message) {
          toast.error(err.response.data.message);
        } else if (err.message === "Network Error") {
          toast.error("Помилка мережі. Перевірте підключення до сервера.");
        } else {
          toast.error("Не вдалося завантажити основну статистику");
        }
      } finally {
        setLoadingStats(false);
      }
    };

    // Функція для завантаження популярних товарів
    const fetchPopularProductsData = async () => {
      setLoadingPopular(true);
      try {
        // Запит на топ-5 товарів за останні 30 днів (можна змінити параметри)
        const popularResponse = await axios.get(
          `${API_URL}/api/admin-stats/popular-products?limit=5&days=30`
        );
        if (popularResponse.data.success) {
          setPopularProducts(popularResponse.data.data);
        } else {
          toast.error(
            popularResponse.data.message ||
              "Помилка завантаження популярних товарів"
          );
        }
      } catch (err) {
        console.error("Popular products fetch error:", err);
        toast.error("Не вдалося завантажити популярні товари");
      } finally {
        setLoadingPopular(false);
      }
    };

    fetchDashboardStats();
    fetchPopularProductsData(); // Викликаємо завантаження популярних товарів
  }, []);

  // Умова завантаження: показуємо, якщо хоча б один із запитів ще виконується
  if (loadingStats || loadingPopular) {
    return (
      <div className="p-10 text-center text-xl text-gray-600">
        Завантаження даних...
      </div>
    );
  }

  // Умова помилки: показуємо, якщо основна статистика не завантажилася (популярні товари - другорядні)
  if (!stats) {
    return (
      <div className="p-10 text-center text-red-600 bg-red-100 border border-red-400 rounded-md">
        Не вдалося завантажити основні дані статистики. Будь ласка, спробуйте
        оновити сторінку.
      </div>
    );
  }

  // Перевіряємо тип даних для безпечного виклику toLocaleString та відображення чисел
  const getSafeStatValue = (value, isCurrency = false) => {
    if (typeof value === "number") {
      return isCurrency
        ? value.toLocaleString("uk-UA", { style: "currency", currency: "UAH" })
        : value;
    }
    return isCurrency ? "0,00 грн" : 0; // Значення за замовчуванням
  };

  return (
    <section className="p-10 w-full bg-primary/20">
      <div className="px-4">
        <div className="flex items-center mb-4">
          <img
            src={Flower}
            alt=""
            className="
                h-12 w-12
                sm:h-14 sm:w-14
                md:h-16 md:w-16
                object-contain
                mr-2 sm:mr-3 md:mr-4
                transform translate-y-[10px]  {/* АБО translate-y-2.5 якщо ви налаштували такі кроки */}
            "
          />
          <h2
            style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
            className="
                text-xl
                sm:text-2xl
                md:text-3xl
                text-center
                text-black
            "
          >
            Панель управління
          </h2>
          <img
            src={Flower}
            alt=""
            className="
                h-12 w-12
                sm:h-14 sm:w-14
                md:h-16 md:w-16
                object-contain
                ml-2 sm:ml-3 md:ml-4
                transform translate-y-[10px] {/* АБО translate-y-2.5 */}
            "
          />
        </div>
        {/* <h1 className="text-3xl font-bold mb-8 ">Панель управління</h1> */}
        {/* Картки основної статистики */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
          <StatCard
            title="Замовлень сьогодні"
            value={getSafeStatValue(stats.ordersToday)}
            bgColor="bg-gradient-to-br from-[#8a100c] to-[#ad413d] text-white"
            icon={<FaShoppingCart />}
          />
          <StatCard
            title="Замовлень цього тижня"
            value={getSafeStatValue(stats.ordersThisWeek)}
            bgColor="bg-gradient-to-br from-[#dea029] to-[#f9c158] text-gray-900"
            icon={<FaCalendarWeek />}
          />
          <StatCard
            title="Продажі за поточний місяць"
            value={getSafeStatValue(stats.totalSalesMonth, true)}
            bgColor="bg-gradient-to-br from-[#096311] to-[#3b8b42] text-white"
            icon={<FaRegMoneyBillAlt />}
          />
          <StatCard
            title="Користувачів"
            value={getSafeStatValue(stats.totalUsers)}
            bgColor="bg-gradient-to-br from-[#4b8cb5] to-[#75b0d4] text-white"
            icon={<FaUsers />}
          />
        </div>

        {/* Секція популярних товарів */}
        <div className="mt-10 p-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FaStar className="mr-2 text-yellow-500" />
            Топ-5 популярних товарів (за 30 днів)
          </h2>
          {popularProducts.length > 0 ? (
            <ul className="space-y-3">
              {popularProducts.map((product, index) => (
                <li
                  key={product._id || index}
                  className="flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  {/* Обгортка для посилання */}
                  <NavLink
                    to={`/admin_panel/product/details/${product._id}`}
                    className="flex items-center overflow-hidden flex-grow mr-4"
                    title={`Переглянути деталі: ${product.name || "Без назви"}`}
                  >
                    {product.image ? (
                      <img
                        src={`${API_URL}/images/${product.image}`}
                        alt={product.name || "Зображення товару"}
                        className="w-12 h-12 object-cover rounded-md mr-4 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-md mr-4 flex items-center justify-center text-gray-400 flex-shrink-0">
                        ?
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {index + 1}. {product.name || "Без назви"}
                      </p>
                    </div>
                  </NavLink>
                  <div className="flex items-center flex-shrink-0">
                    <p className="font-semibold text-blue-500 whitespace-nowrap mr-3">
                      {product.totalSold} продано
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !loadingPopular && (
              <p className="text-gray-500">
                Немає даних про популярні товари за вказаний період.
              </p>
            )
          )}
          {loadingPopular && (
            <p className="text-gray-500">Завантаження популярних товарів...</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;

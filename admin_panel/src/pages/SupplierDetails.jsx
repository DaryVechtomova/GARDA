import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate, NavLink } from "react-router-dom"; // Додав NavLink
import { FaArrowLeft, FaEdit, FaSpinner } from "react-icons/fa"; // Додав іконки
import Flower from "../assets/design/flower.png";

const SupplierDetails = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const url = "http://localhost:4000";
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null); // Змінив назву стану
  const [loading, setLoading] = useState(true);

  // Функція для форматування дати у формат дд.мм.рррр
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A"; // Якщо дати немає
    try {
      const date = new Date(dateString);
      // Перевірка на валідність дати
      if (isNaN(date.getTime())) {
        return "Некорректна дата";
      }
      return date.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Помилка форматування";
    }
  };

  // Стилі для статусів
  const getStatusStyle = (status) => {
    switch (
      status?.toLowerCase() // Додав ?.toLowerCase() для безпеки
    ) {
      case "активний":
        return "bg-green-100 text-green-800";
      case "на розгляді":
        return "bg-yellow-100 text-yellow-800";
      case "призупинений":
        return "bg-orange-100 text-orange-800";
      case "завершений":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) {
        toast.error("ID постачальника не вказано.");
        navigate("/admin_panel/list-supplier");
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${url}/api/suppliers/details/${id}`);
        if (response.data.success && response.data.data) {
          setSupplier(response.data.data);
        } else {
          toast.error(
            response.data.message || "Помилка завантаження даних постачальника"
          );
          setSupplier(null); // Скидаємо дані у разі помилки
        }
      } catch (error) {
        toast.error("Не вдалося отримати дані постачальника");
        console.error("Помилка завантаження постачальника:", error);
        setSupplier(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id, navigate, url]); // Додав залежності

  // Функція для безпечного відображення значення або "Не вказано"
  const displayValue = (value) => {
    return value !== null && value !== undefined && value !== "" ? (
      value
    ) : (
      <span className="italic text-gray-500">Не вказано</span>
    );
  };

  // --- Рендеринг ---
  if (loading) {
    return (
      <section className="w-full min-h-screen flex justify-center items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <FaSpinner className="animate-spin text-xl" />
          <span>Завантаження даних постачальника...</span>
        </div>
      </section>
    );
  }

  if (!supplier) {
    return (
      <section className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500 text-lg">
          Не вдалося завантажити дані постачальника.
        </p>
        <button
          onClick={() => navigate("/admin_panel/list-supplier")}
          className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
        >
          <FaArrowLeft /> До списку постачальників
        </button>
      </section>
    );
  }

  return (
    <section className="p-10 w-full bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-4 border-b">
          <div>
            <div className="flex items-center justify-center mb-2">
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
                Постачальник: {supplier.companyName}
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
            {/* <h4 className="text-xl font-semibold uppercase text-gray-800">
                            Постачальник: {supplier.companyName}
                        </h4> */}
            <p className="text-sm text-gray-500">ID: {supplier._id}</p>
          </div>
          {/* Статус */}
          <span
            className={`mt-2 sm:mt-0 px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(
              supplier.status
            )}`}
          >
            {supplier.status || "Невідомо"}
          </span>
        </div>
        {/* Секція з даними (використовуємо Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Блок для кожного поля */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Назва компанії</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.companyName)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Контактна особа</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.contactPerson)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Email</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.email)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Телефон</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.phone)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Країна</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.country)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Місто</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.city)}
            </p>
          </div>

          {/* Адреса може займати всю ширину */}
          <div className="space-y-1 md:col-span-2">
            <p className="text-sm font-medium text-gray-900">Адреса</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {displayValue(supplier.address)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              Дата початку співпраці
            </p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
              {formatDateForDisplay(supplier.cooperationStartDate)}
            </p>
          </div>

          {/* Показуємо дату завершення, тільки якщо вона є */}
          {supplier.cooperationEndDate && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                Дата завершення співпраці
              </p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {formatDateForDisplay(supplier.cooperationEndDate)}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Тип продукції</p>
            <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px] capitalize">
              {" "}
              {/* Додав capitalize */}
              {displayValue(supplier.productType)}
            </p>
          </div>
          {/* Нотатки, якщо є */}
          {supplier.notes && (
            <div className="space-y-1 md:col-span-2">
              {" "}
              {/* Займає всю ширину */}
              <p className="text-sm font-medium text-gray-900">Нотатки</p>
              <p className="text-base text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 min-h-[60px] whitespace-pre-wrap">
                {" "}
                {/* whitespace-pre-wrap для збереження переносів рядків */}
                {displayValue(supplier.notes)}
              </p>
            </div>
          )}
        </div>{" "}
        {/* Кінець Grid */}
        {/* Кнопки дій */}
        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={() => navigate(-1)} // Кнопка Назад
            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
          >
            <FaArrowLeft /> Назад
          </button>
          <NavLink
            to={`/admin_panel/edit-supplier/${id}`} // Посилання на редагування
            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-yellow-500 text-black font-medium rounded-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 transition text-sm"
          >
            <FaEdit /> Редагувати
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default SupplierDetails;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate, NavLink } from "react-router-dom"; // Додав NavLink
import { FaArrowLeft, FaEdit, FaSpinner, FaUserCircle } from "react-icons/fa"; // Додав іконки
import Flower from "../assets/design/flower.png";

function EmployeeDetails() {
  const url = "http://localhost:4000";
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Отримання деталей співробітника
  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!id) {
        toast.error("ID співробітника не вказано.");
        navigate("/admin_panel/list-employees");
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${url}/api/user/details/${id}`);
        if (response.data.success) {
          setEmployee(response.data.data);
        } else {
          toast.error(
            response.data.message || "Не вдалося завантажити дані співробітника"
          );
          setEmployee(null);
        }
      } catch (error) {
        toast.error("Помилка при отриманні даних співробітника");
        console.error("Помилка завантаження:", error);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeDetails();
  }, [id, navigate, url]); // Додав залежності

  // Функція для форматування дати
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Некорректна дата";
      return date.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return "Помилка";
    }
  };

  // Функція для безпечного відображення значення
  const displayValue = (value) => {
    return value !== null && value !== undefined && value !== "" ? (
      value
    ) : (
      <span className="italic text-gray-500">Не вказано</span>
    );
  };

  // Стилі для статусу активності
  const getIsActiveStyle = (isActive) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  // Рендеринг
  if (loading) {
    return (
      <section className="w-full min-h-screen flex justify-center items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <FaSpinner className="animate-spin text-xl" />
          <span>Завантаження даних...</span>
        </div>
      </section>
    );
  }

  if (!employee) {
    return (
      <section className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500 text-lg">
          Не вдалося завантажити дані співробітника.
        </p>
        <button
          onClick={() => navigate("/admin_panel/list-employees")}
          className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
        >
          <FaArrowLeft /> До списку співробітників
        </button>
      </section>
    );
  }

  // Формуємо повне ім'я для заголовка
  const fullName = `${employee.secondName || ""} ${employee.firstName || ""} ${
    employee.middleName || ""
  }`.trim();

  return (
    <div className="bg-gray-100 min-h-[92vh]">
      <section className="p-10 w-full flex justify-center">
        <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          {/* Заголовок */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-4 border-b">
            <div>
              <h3
                style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
                className="
            text-xl
            sm:text-2xl
            md:text-3xl
            text-center
          text-black
            "
              >
                {fullName || "Деталі співробітника"}
              </h3>
              {/* <h4 className="text-xl font-semibold uppercase text-gray-800 flex items-center gap-2">
                                <FaUserCircle className="text-gray-500" /> {fullName || "Деталі співробітника"}
                            </h4> */}
              <p className="text-sm text-gray-500">ID: {employee._id}</p>
            </div>
            {/* Статус Активності */}
            <span
              className={`mt-2 sm:mt-0 px-3 py-1 text-xs font-medium rounded-full ${getIsActiveStyle(
                employee.isActive
              )}`}
            >
              {employee.isActive ? "Активний" : "Неактивний"}
            </span>
          </div>
          {/* Секція з даними */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {/* Ім'я */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Ім'я</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {displayValue(employee.firstName)}
              </p>
            </div>

            {/* Прізвище */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Прізвище</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {displayValue(employee.secondName)}
              </p>
            </div>

            {/* По батькові */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">По батькові</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {displayValue(employee.middleName)}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Email (Логін)</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {displayValue(employee.email)}
              </p>
            </div>

            {/* Телефон */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Телефон</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {displayValue(employee.phoneNumber)}
              </p>
            </div>

            {/* Дата народження */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">
                Дата народження
              </p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {formatDateForDisplay(employee.birthDate)}
              </p>
            </div>

            {/* Роль */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Роль</p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px] capitalize">
                {" "}
                {/* Додав capitalize */}
                {displayValue(employee.role)}
              </p>
            </div>

            {/* Дата прийому на роботу */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">
                Дата прийому на роботу
              </p>
              <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                {formatDateForDisplay(employee.hireDate)}
              </p>
            </div>

            {/* Дата звільнення (якщо є) */}
            {employee.fireDate && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">
                  Дата звільнення
                </p>
                <p className="text-base text-gray-800 bg-gray-100 p-2 rounded border border-gray-200 min-h-[38px]">
                  {formatDateForDisplay(employee.fireDate)}
                </p>
              </div>
            )}
          </div>{" "}
          {/* Кінець Grid */}
          {/* Кнопки дій */}
          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
            >
              <FaArrowLeft /> Назад
            </button>
            <NavLink
              to={`/admin_panel/edit-employee/${id}`} // Посилання на редагування
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-yellow-500 text-black font-medium rounded-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 transition text-sm"
            >
              <FaEdit /> Редагувати
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}

export default EmployeeDetails;

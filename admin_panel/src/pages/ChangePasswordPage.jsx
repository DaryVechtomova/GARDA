import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaSave,
  FaArrowLeft,
  FaSpinner,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import Flower from "../assets/design/flower.png";

const ChangePasswordPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const url = "http://localhost:4000";
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  // Стан для відстеження видимості кожного поля пароля окремо
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    // Очищаємо помилку при зміні поля
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    // Якщо змінюємо новий пароль, очищаємо помилку підтвердження
    if (name === "newPassword" && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: null }));
    }
  };

  // Функція для перемикання видимості конкретного поля
  const togglePasswordVisibility = (fieldKey) => {
    setShowPassword((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey], // Перемикаємо значення для конкретного ключа
    }));
  };

  // Валідація форми
  const validateForm = () => {
    const newErrors = {};
    if (!passwords.oldPassword) {
      newErrors.oldPassword = "Старий пароль є обов'язковим";
    }
    if (!passwords.newPassword) {
      newErrors.newPassword = "Новий пароль є обов'язковим";
    } else if (passwords.newPassword.length < 8) {
      newErrors.newPassword = "Новий пароль має містити щонайменше 8 символів";
    }
    if (!passwords.confirmPassword) {
      newErrors.confirmPassword = "Підтвердження пароля є обов'язковим";
    } else if (
      passwords.newPassword &&
      passwords.confirmPassword !== passwords.newPassword
    ) {
      newErrors.confirmPassword = "Паролі не співпадають";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.post(`${url}/api/user/change-password`, {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      });

      if (response.data.success) {
        toast.success("Пароль успішно змінено!");
        setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
        navigate("/admin_panel/profile"); // Повертаємось до профілю
      } else {
        // Якщо бекенд повертає помилку про старий пароль, показуємо її біля поля
        if (
          response.data.message &&
          response.data.message.toLowerCase().includes("старий пароль")
        ) {
          setErrors((prev) => ({
            ...prev,
            oldPassword: response.data.message,
          }));
        } else {
          toast.error(response.data.message || "Помилка зміни пароля");
        }
      }
    } catch (error) {
      console.error("Помилка зміни пароля:", error);
      // Обробляємо помилку старого пароля з відповіді сервера
      if (
        error.response?.data?.message &&
        error.response.data.message.toLowerCase().includes("старий пароль")
      ) {
        setErrors((prev) => ({
          ...prev,
          oldPassword: error.response.data.message,
        }));
      } else {
        toast.error(error.response?.data?.message || "Помилка сервера");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-[92vh]">
      <section className="p-16 w-full flex justify-center">
        {/* Центруємо контейнер */}
        <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center mb-2 border-b">
            <img
              src={Flower}
              alt=""
              className="
                h-12 w-12
                sm:h-14 sm:w-14
                md:h-16 md:w-16
                object-contain
                mr-2 sm:mr-3 md:mr-4
                transform translate-y-[10px]
                "
            />
            <h2
              style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
              className="
                text-xl
                sm:text-2xl
                md:text-2xl
                text-center
                text-black
                "
            >
              Зміна пароля
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
          {/* <h4 className="text-xl font-semibold pb-4 mb-6 uppercase border-b text-gray-800">
                        Зміна пароля
                    </h4> */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Старий пароль */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="oldPassword"
                className="text-sm font-medium text-gray-600"
              >
                Старий пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="oldPassword"
                  name="oldPassword"
                  type={showPassword.old ? "text" : "password"}
                  value={passwords.oldPassword}
                  onChange={handleChange}
                  className={`border rounded-md py-1.5 pl-3 pr-10 h-[38px] w-full outline-none focus:ring-1 focus:ring-offset-1 transition duration-150 ease-in-out ${
                    errors.oldPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  autoComplete="current-password"
                  ї
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("old")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={
                    showPassword.old ? "Сховати пароль" : "Показати пароль"
                  }
                >
                  {/* Умова для іконки */}
                  {showPassword.old ? (
                    <FaEye size={16} />
                  ) : (
                    <FaEyeSlash size={16} />
                  )}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.oldPassword}
                </p>
              )}
            </div>

            {/* Новий пароль */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-gray-600"
              >
                Новий пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword.new ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={handleChange}
                  className={`border rounded-md py-1.5 pl-3 pr-10 h-[38px] w-full outline-none focus:ring-1 focus:ring-offset-1 transition duration-150 ease-in-out ${
                    errors.newPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={
                    showPassword.new ? "Сховати пароль" : "Показати пароль"
                  }
                >
                  {/* Умова для іконки */}
                  {showPassword.new ? (
                    <FaEye size={16} />
                  ) : (
                    <FaEyeSlash size={16} />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Підтвердження нового пароля */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-600"
              >
                Підтвердіть новий пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className={`border rounded-md py-1.5 pl-3 pr-10 h-[38px] w-full outline-none focus:ring-1 focus:ring-offset-1 transition duration-150 ease-in-out ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")} // Перемикаємо видимість для 'confirm'
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={
                    showPassword.confirm ? "Сховати пароль" : "Показати пароль"
                  }
                >
                  {/* Умова для іконки */}
                  {showPassword.confirm ? (
                    <FaEye size={16} />
                  ) : (
                    <FaEyeSlash size={16} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md transition text-sm"
              >
                <FaArrowLeft /> Скасувати
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {isSaving ? "Збереження..." : "Змінити пароль"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ChangePasswordPage;

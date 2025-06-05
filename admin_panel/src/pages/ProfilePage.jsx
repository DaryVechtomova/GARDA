import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import { FaSpinner, FaSave, FaKey, FaTimes } from "react-icons/fa";
import Flower from "../assets/design/flower.png";

const ProfilePage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const url = "http://localhost:4000"; // Ваш URL
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState({
    _id: "",
    firstName: "",
    secondName: "",
    middleName: "",
    email: "", // Тільки для перегляду
    phoneNumber: "",
    birthDate: "",
    role: "", // Тільки для перегляду
    hireDate: "",
  });

  const onPhoneAccept = (value) => {
    setUserData((prevData) => ({ ...prevData, phoneNumber: value }));
  };

  // Форматування дати для input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "";
    }
  };

  // Завантаження даних поточного користувача
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setLoading(true);
      try {
        // Використовуємо ендпоінт /api/user/me, який ви створили
        const response = await axios.get(`${url}/api/user/me`);
        if (response.data.success && response.data.userData) {
          const fetchedData = response.data.userData;
          setUserData({
            _id: fetchedData._id || fetchedData.id, // ID може бути _id або id
            firstName: fetchedData.firstName || "",
            secondName: fetchedData.secondName || "",
            middleName: fetchedData.middleName || "",
            email: fetchedData.email || "",
            phoneNumber: fetchedData.phoneNumber || "",
            birthDate: formatDateForInput(fetchedData.birthDate),
            role: fetchedData.role || "N/A",
            hireDate: formatDateForInput(fetchedData.hireDate),
          });
        } else {
          toast.error(
            response.userData.message || "Не вдалося завантажити дані профілю"
          );
          // Можливо, перенаправити на логін, якщо дані не завантажено
          // navigate('/login');
        }
      } catch (error) {
        console.error("Помилка завантаження профілю:", error);
        toast.error("Помилка сервера при завантаженні профілю");
        // navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, [url]); // Додав url до залежностей

  const onChangeHandler = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  // Збереження змін профілю
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Відправляємо тільки ті поля, які можна редагувати
      const { email, role, _id, ...dataToSave } = userData; // Виключаємо email, role, _id
      const response = await axios.put(`${url}/api/user/update-profile`, {
        id: userData._id, // Надсилаємо ID
        ...dataToSave,
      });

      // Исправлено: обращаемся к response.data, а не response.userData
      if (response.data.success) {
        toast.success("Профіль успішно оновлено!");
        // Опціонально: оновити дані в localStorage, якщо ви їх там зберігаєте
        localStorage.setItem(
          "adminUserData",
          JSON.stringify(response.data.updatedUser)
        );
      } else {
        toast.error(response.data.message || "Помилка оновлення профілю");
      }
    } catch (error) {
      console.error("Помилка збереження профілю:", error);
      // Исправлено: обращаемся к error.response?.data?.message
      toast.error(error.response?.data?.message || "Помилка сервера");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="w-full min-h-screen flex justify-center items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <FaSpinner className="animate-spin text-xl" />
          <span>Завантаження профілю...</span>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-gray-100 min-h-[92vh]">
      <section className="p-16 w-full flex justify-center">
        <div className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
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
                md:text-3xl
                text-center
                text-black
                "
            >
              Ваш профіль
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
                        Ваш профіль
                    </h4> */}
          <form onSubmit={handleProfileSave} className="space-y-4">
            {/* Поля для редагування */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Ім'я */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-600"
                >
                  Ім'я <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={userData.firstName}
                  onChange={onChangeHandler}
                  className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* Прізвище */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="secondName"
                  className="text-sm font-medium text-gray-600"
                >
                  Прізвище <span className="text-red-500">*</span>
                </label>
                <input
                  id="secondName"
                  name="secondName"
                  type="text"
                  value={userData.secondName}
                  onChange={onChangeHandler}
                  className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* По батькові */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="middleName"
                  className="text-sm font-medium text-gray-600"
                >
                  По батькові <span className="text-red-500">*</span>
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={userData.middleName}
                  onChange={onChangeHandler}
                  className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* Телефон */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="phoneNumber"
                  className="text-sm font-medium text-gray-600"
                >
                  Телефон <span className="text-red-500">*</span>
                </label>
                <IMaskInput
                  mask="+38 (000) 000-00-00"
                  value={userData.phoneNumber}
                  onAccept={onPhoneAccept}
                  placeholder="+38 (0XX) XXX-XX-XX"
                  id="phoneNumber"
                  name="phoneNumber"
                  className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                />
              </div>
            </div>

            {/* Поля тільки для перегляду */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t mt-4">
              {/* Дата народження */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="birthDate"
                  className="text-sm font-medium text-gray-600"
                >
                  Дата народження
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={userData.birthDate}
                  readOnly
                  className="border border-gray-200 bg-gray-100 rounded-md py-1.5 px-3 h-[38px] text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Дата прийому на роботу */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="hireDate"
                  className="text-sm font-medium text-gray-600"
                >
                  Дата прийому на роботу
                </label>
                <input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  value={userData.hireDate}
                  readOnly
                  className="border border-gray-200 bg-gray-100 rounded-md py-1.5 px-3 h-[38px] text-gray-700 cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col gap-y-1">
                <label className="text-sm font-medium text-gray-500">
                  Email (Логін){" "}
                </label>
                <div className="border border-gray-200 bg-gray-100 rounded-md py-1.5 px-3 h-[38px] flex items-center text-gray-700">
                  {userData.email}
                </div>
              </div>
              <div className="flex flex-col gap-y-1">
                <label className="text-sm font-medium text-gray-500">
                  Роль
                </label>
                <div className="border border-gray-200 bg-gray-100 rounded-md py-1.5 px-3 h-[38px] flex items-center text-gray-700 capitalize">
                  {userData.role}
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate("/admin_panel/change-password")} // Перехід на сторінку зміни пароля
                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
              >
                <FaKey /> Змінити пароль
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {isSaving ? "Збереження..." : "Зберегти профіль"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;

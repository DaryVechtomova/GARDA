import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaSave, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import Flower from "../assets/design/flower.png";

const EditSupplier = () => {
  const url = "http://localhost:4000";
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState(null); // Для порівняння змін
  const [data, setData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Україна",
    cooperationStartDate: "",
    cooperationEndDate: "",
    productType: "",
    status: "",
    notes: "",
  });

  // Функція для форматування дати у формат рррр-мм-дд для <input type="date">
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ""; // Перевірка на валідність
      // Повертає рядок у форматі YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Error formatting date for input:", dateString, e);
      return "";
    }
  };

  // Функція для форматування дати у формат дд.мм.рррр для відображення
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

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) {
        toast.error("ID постачальника не вказано.");
        navigate("/admin_panel/list-supplier");
        return;
      }
      setLoading(true);
      try {
        // Використовуємо GET-запит, який повертає дані для редагування
        const response = await axios.get(
          `${url}/api/suppliers/edit-supplier/${id}`
        );

        if (response.data.success && response.data.data) {
          const supplierData = response.data.data;
          // Форматуємо дати для полів вводу
          const formattedData = {
            ...supplierData,
            cooperationStartDate: formatDateForInput(
              supplierData.cooperationStartDate
            ),
            // Дату завершення теж форматуємо, якщо вона редагована
            cooperationEndDate: formatDateForInput(
              supplierData.cooperationEndDate
            ),
          };
          setData(formattedData);
          setInitialData(formattedData); // Зберігаємо початкові дані
        } else {
          toast.error(
            response.data.message || "Помилка завантаження даних постачальника"
          );
          navigate("/admin_panel/list-supplier"); // Повертаємось, якщо не вдалося завантажити
        }
      } catch (error) {
        toast.error("Не вдалося отримати дані постачальника для редагування");
        console.error("Помилка завантаження:", error);
        navigate("/admin_panel/list-supplier");
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id, navigate, url]);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  const onPhoneAccept = (value) => {
    setData((prevData) => ({ ...prevData, phone: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(`${url}/api/suppliers/edit-supplier`, {
        id: data._id,
        ...data,
      });
      if (response.data.success) {
        toast.success(response.data.message);
        navigate("/admin_panel/list-supplier");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Помилка при оновленні постачальника");
      console.error("Помилка:", error);
    }
  };

  // Визначаємо, чи можна редагувати поля (все, крім статусу, якщо статус "завершений")
  const isFormDisabled = data.status === "завершений";

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

  if (!data || !initialData) {
    // Перевірка, чи дані завантажено
    return (
      <section className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500 text-lg">
          Не вдалося завантажити дані постачальника для редагування.
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
            Редагування постачальника: {initialData.companyName}
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
                    Редагування постачальника: {initialData.companyName}
                </h4> */}

        <form onSubmit={onSubmitHandler} className="space-y-4">
          {/* Використовуємо Grid для полів */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Назва компанії */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="companyName"
                className="text-base font-medium text-gray-900"
              >
                Назва компанії <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                onChange={onChangeHandler}
                value={data.companyName}
                name="companyName"
                type="text"
                placeholder='ТОВ "Найкращий одяг"'
                required
                disabled={isFormDisabled} // Вимикаємо поле, якщо статус "завершений"
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Контактна особа */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="contactPerson"
                className="text-base font-medium text-gray-900"
              >
                Контактна особа <span className="text-red-500">*</span>
              </label>
              <input
                id="contactPerson"
                onChange={onChangeHandler}
                value={data.contactPerson}
                name="contactPerson"
                type="text"
                placeholder="Ім Прізвище"
                required
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="email"
                className="text-base font-medium text-gray-900"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                onChange={onChangeHandler}
                value={data.email}
                name="email"
                type="email"
                placeholder="example@company.com"
                required
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Телефон */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="phone"
                className="text-base font-medium text-gray-900"
              >
                Телефон <span className="text-red-500">*</span>
              </label>
              <IMaskInput
                mask="+38 (000) 000-00-00"
                value={data.phone} // IMaskInput приймає value
                unmask={true} // Можливо, потрібно передавати без маски на бекенд
                onAccept={onPhoneAccept}
                placeholder="+38 (0XX) XXX-XX-XX"
                id="phone"
                required
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Адреса */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="address"
                className="text-base font-medium text-gray-900"
              >
                Адреса <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                onChange={onChangeHandler}
                value={data.address}
                name="address"
                type="text"
                placeholder="вул. Прикладна, 1"
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Місто */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="city"
                className="text-base font-medium text-gray-900"
              >
                Місто <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                onChange={onChangeHandler}
                value={data.city}
                name="city"
                type="text"
                placeholder="Наприклад, Київ"
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Країна */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="country"
                className="text-base font-medium text-gray-900"
              >
                Країна <span className="text-red-500">*</span>
              </label>
              <input
                id="country"
                onChange={onChangeHandler}
                value={data.country}
                name="country"
                type="text"
                placeholder="Україна"
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Дата початку співпраці (тільки для перегляду) */}
            <div className="flex flex-col gap-y-1">
              <label className="text-base font-medium text-gray-900">
                Дата початку співпраці <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] bg-gray-100 text-gray-700 flex items-center">
                {formatDateForDisplay(initialData.cooperationStartDate)}{" "}
                {/* Показуємо початкову дату */}
              </div>
            </div>

            {/* Дата завершення співпраці (редагована, якщо статус не 'завершений') */}
            {data.status !== "активний" && (
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="cooperationEndDate"
                  className="text-base font-medium text-gray-900"
                >
                  Дата завершення співпраці{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="cooperationEndDate"
                  onChange={onChangeHandler}
                  value={data.cooperationEndDate}
                  name="cooperationEndDate"
                  type="date"
                  min={data.cooperationStartDate}
                  disabled={isFormDisabled}
                  className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Тип продукції */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="productType"
                className="text-base font-medium text-gray-900"
              >
                Тип продукції <span className="text-red-500">*</span>
              </label>
              <select
                id="productType"
                onChange={onChangeHandler}
                value={data.productType}
                name="productType"
                required
                disabled={isFormDisabled}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  -- Оберіть тип --
                </option>
                <option value="одяг">Одяг</option>
                <option value="аксесуари">Аксесуари</option>
                <option value="тканина">Тканина</option>
                <option value="фурнітура">Фурнітура</option>
                <option value="інше">Інше</option>
              </select>
            </div>

            {/* Статус (завжди редагований) */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="status"
                className="text-base font-medium text-gray-900"
              >
                Статус <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                onChange={onChangeHandler}
                value={data.status}
                name="status"
                required
                // Статус можна змінювати завжди
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
              >
                <option value="" disabled>
                  -- Оберіть статус --
                </option>
                <option value="активний">Активний</option>
                <option value="призупинений">Призупинений</option>
                <option value="завершений">Завершений</option>
              </select>
            </div>
          </div>{" "}
          {/* Кінець Grid */}
          {/* Нотатки */}
          <div className="flex flex-col gap-y-1 pt-2">
            <label
              htmlFor="notes"
              className="text-base font-medium text-gray-900"
            >
              Нотатки
            </label>
            <textarea
              id="notes"
              onChange={onChangeHandler}
              value={data.notes}
              name="notes"
              placeholder="Додаткова інформація, умови співпраці тощо..."
              rows={4}
              disabled={isFormDisabled}
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px] transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
            ></textarea>
          </div>
          {/* Кнопки */}
          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)} // Кнопка Назад/Скасувати
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
            >
              <FaArrowLeft /> Скасувати
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
              disabled={isSaving} // Блокуємо під час збереження
            >
              <FaSave /> {isSaving ? "Збереження..." : "Зберегти зміни"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EditSupplier;

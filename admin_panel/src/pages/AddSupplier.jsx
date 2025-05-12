import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaArrowLeft } from "react-icons/fa";
import { IMaskInput } from "react-imask";
import { useNavigate } from "react-router-dom"; // Для кнопки "Назад"
import Flower from "../assets/design/flower.png";

const AddSupplier = () => {
  const url = "http://localhost:4000";
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false); // Стан для блокування кнопки
  const [data, setData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Україна", // Залишаємо Україну за замовчуванням
    cooperationStartDate: new Date().toISOString().split("T")[0], // Поточна дата
    productType: "", // Змінено на порожній рядок для валідації
    status: "", // Змінено на порожній рядок для валідації
    notes: "",
  });

  // Обробник зміни полів форми
  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Обробник зміни для IMaskInput (телефон)
  const onPhoneAccept = (value) => {
    setData((prevData) => ({ ...prevData, phone: value }));
  };

  // Відправка форми
  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(
        `${url}/api/suppliers/add-supplier`,
        data
      );
      if (response.data.success) {
        toast.success(response.data.message);
        // Очищення форми після успішного додавання
        setData({
          companyName: "",
          contactPerson: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "Україна",
          cooperationStartDate: new Date().toISOString().split("T")[0],
          productType: "Оберіть тип продукції",
          status: "Оберіть статус",
          notes: "",
        });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        toast.error(
          error.response.data.message || "Не вдалося додати постачальника"
        );
      } else if (error.request) {
        toast.error("Не вдалося отримати відповідь від сервера");
      } else {
        toast.error("Помилка при налаштуванні запиту");
      }
      console.error("Помилка:", error);
    }
  };

  return (
    <section className="p-10 w-full bg-gray-100 min-h-screen flex justify-center">
      {/* Центрування форми */}
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
            Додавання нового постачальника
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
                    Додавання нового постачальника
                </h4> */}

        <form onSubmit={onSubmitHandler} className="space-y-4">
          {" "}
          {/* Використовуємо space-y для вертикальних відступів */}
          {/* Використовуємо Grid для кращого розташування */}
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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                placeholder="ПІБ"
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                mask="+38 (000) 000-00-00" // Оновив маску для зручності
                value={data.phone}
                onAccept={onPhoneAccept} // Використовуємо onAccept для оновлення стану
                placeholder="+38 (0XX) XXX-XX-XX"
                id="phone" // Додав id для label
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
              />
            </div>

            {/* Дата початку співпраці */}
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="cooperationStartDate"
                className="text-base font-medium text-gray-900"
              >
                Дата початку співпраці <span className="text-red-500">*</span>
              </label>
              <input
                id="cooperationStartDate"
                onChange={onChangeHandler}
                value={data.cooperationStartDate}
                name="cooperationStartDate"
                type="date"
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
              />
            </div>

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
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
              >
                <option value="" disabled>
                  -- Оберіть тип --
                </option>
                <option value="одяг">Одяг</option>
                <option value="аксесуари">Аксесуари</option>
                <option value="інше">Інше</option>
              </select>
            </div>

            {/* Статус */}
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
          {/* Нотатки - займає всю ширину */}
          <div className="flex flex-col gap-y-1 pt-2">
            {" "}
            {/* Додав невеликий відступ зверху */}
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
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px] transition duration-150 ease-in-out"
            ></textarea>
          </div>
          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
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
              disabled={isSaving}
            >
              <FaPlus /> {isSaving ? "Збереження..." : "Додати постачальника"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default AddSupplier;

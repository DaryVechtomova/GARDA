import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaTrash, FaUpload, FaArrowLeft } from "react-icons/fa"; // Додав FaUpload для кнопки вибору файлів
import Flower from "../assets/design/flower.png";

const Edit = () => {
  const url = "http://localhost:4000"; // URL вашого бекенду
  const { id } = useParams();
  const navigate = useNavigate();

  // --- Змінні стану ---
  const [images, setImages] = useState([]); // Нові файли зображень для завантаження
  const [existingImages, setExistingImages] = useState([]); // Масив імен існуючих файлів зображень
  const [data, setData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Для жінок", // Початкове значення
    threads: "",
    cut: "",
    technique: "",
    fabric: "",
    colors: "",
  });
  const [sizes, setSizes] = useState([]); // Масив об'єктів { size: 'S', quantity: 10 }

  // --- Отримання даних товару ---
  useEffect(() => {
    const fetchProduct = async () => {
      // Перевірка чи є ID
      if (!id) {
        toast.error("ID товару не вказано.");
        navigate("/admin_panel/list-product"); // Повернення, якщо ID немає
        return;
      }

      try {
        const response = await axios.get(
          `${url}/api/product/edit-product/${id}`
        );
        if (response.data.success && response.data.data) {
          const productData = response.data.data;
          // Оновлення стану з отриманими даними
          setData({
            name: productData.name || "",
            description: productData.description || "",
            price: productData.price || "",
            category: productData.category || "Для жінок", // Застосовуємо значення за замовчуванням, якщо немає
            threads: productData.threads || "",
            cut: productData.cut || "",
            technique: productData.technique || "",
            fabric: productData.fabric || "",
            colors: productData.colors || "",
          });
          // Переконуємося, що images та sizes є масивами
          setExistingImages(
            Array.isArray(productData.images) ? productData.images : []
          );
          setSizes(Array.isArray(productData.sizes) ? productData.sizes : []);
        } else {
          toast.error(response.data.message || "Помилка завантаження товару");
          navigate("/admin_panel/list-product"); // Повернення у разі помилки
        }
      } catch (error) {
        toast.error("Не вдалося отримати дані товару");
        console.error("Помилка завантаження товару:", error);
        navigate("/admin_panel/list-product"); // Повернення у разі виключення
      }
    };
    fetchProduct();
  }, [id, url, navigate]); // Додали url та navigate до залежностей

  // --- Обробники подій ---

  // Обробка зміни файлів
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    // Проста валідація типів файлів (опціонально)
    const validImageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );
    if (validImageFiles.length !== files.length) {
      toast.warn(
        "Було обрано файли, що не є зображеннями. Вони були проігноровані."
      );
    }
    setImages((prev) => [...prev, ...validImageFiles]);
  };

  // Видалення існуючого зображення (за ім'ям файлу)
  const removeExistingImage = (imageToRemove) => {
    setExistingImages(
      existingImages.filter((image) => image !== imageToRemove)
    );
    toast.info(`Зображення ${imageToRemove} буде видалено при збереженні.`);
  };

  // Видалення нового зображення (за індексом)
  const removeNewImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  // Обробка зміни полів форми
  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Відправка форми
  const onSubmitHandler = async (event) => {
    event.preventDefault();

    // Валідація основних полів (приклад)
    if (
      !data.name ||
      !data.price ||
      !data.category ||
      data.category === "Оберіть категорію"
    ) {
      toast.error(
        "Будь ласка, заповніть обов'язкові поля: Назва, Ціна, Категорія."
      );
      return;
    }
    if (existingImages.length === 0 && images.length === 0) {
      toast.warn("Ви не додали жодного зображення.");
      // Можна продовжити або зупинити залежно від бізнес-логіки
    }

    const formData = new FormData();
    formData.append("id", id); // Обов'язково додаємо ID для оновлення

    // Додаємо текстові дані
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });

    // Додаємо нові зображення (файли)
    images.forEach((imageFile) => {
      formData.append("images", imageFile); // ключ 'images' для нових файлів
    });

    // Передаємо список імен залишених існуючих зображень
    // Важливо: надсилаємо як JSON-рядок, який бекенд має розпарсити
    formData.append("existingImages", JSON.stringify(existingImages));

    try {
      const response = await axios.post(
        `${url}/api/product/edit-product`,
        formData,
        {
          headers: {
            // Content-Type встановлюється автоматично браузером для FormData
            // "Content-Type": "multipart/form-data" - зазвичай не потрібно вказувати з axios
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Товар успішно оновлено!");
        // Очистка стану нових зображень після успішного завантаження
        setImages([]);
        // Опціонально: перенаправлення після успіху
        navigate("/admin_panel/list-product");
      } else {
        // Показ помилки з бекенду
        toast.error(response.data.message || "Не вдалося оновити товар.");
      }
    } catch (error) {
      console.error("Помилка оновлення товару:", error);
      // Спроба показати більш детальну помилку
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Сталася помилка мережі або сервера.";
      toast.error(`Помилка: ${errorMessage}`);
    }
  };

  // --- JSX Рендеринг ---
  return (
    <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen flex justify-center">
      <form
        onSubmit={onSubmitHandler}
        className="flex flex-col gap-y-5 max-w-4xl w-full mx-auto bg-white p-6 rounded-lg shadow-md"
      >
        <div className="flex items-center mb-2">
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
            Редагування товару (ID: {id})
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
        {/* <h4 className="text-xl font-semibold pb-2 uppercase border-b border-gray-300 text-gray-800 mb-4">
                    Редагування товару (ID: {id})
                </h4> */}

        {/* Завантаження та управління зображеннями */}
        <fieldset className="border border-gray-300 p-4 rounded-md">
          <legend className="text-base font-medium px-2 text-gray-900">
            Зображення товару <span className="text-red-500">*</span>
          </legend>

          {/* Контейнер для прев'ю */}
          <div className="flex flex-wrap gap-3 mb-3 min-h-[110px]">
            {" "}
            {/* Додано min-h */}
            {/* Прев'ю існуючих зображень */}
            {existingImages.map((imageName, index) => (
              <div key={`existing-${index}`} className="relative group">
                <img
                  src={`${url}/images/${imageName}`} // Правильний шлях до зображення
                  alt={`Існуюче зображення ${index + 1}`}
                  className="h-24 w-24 object-cover rounded-md border border-gray-200 shadow-sm"
                  // Обробник помилки завантаження зображення
                  onError={(e) => {
                    e.target.src =
                      "/placeholder-image.png"; /* Шлях до плейсхолдера */
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(imageName)}
                  title="Видалити це зображення"
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
            {/* Прев'ю нових зображень */}
            {images.map((imageFile, index) => (
              <div key={`new-${index}`} className="relative group">
                <img
                  src={URL.createObjectURL(imageFile)} // Створюємо URL для прев'ю
                  alt={`Нове зображення ${index + 1}`}
                  className="h-24 w-24 object-cover rounded-md border border-blue-300 shadow-sm" // Інший бордер для нових
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Очищаємо URL після завантаження
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  title="Скасувати додавання цього зображення"
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Прихований інпут для файлів */}
          <input
            onChange={handleImageChange}
            type="file"
            id="images"
            multiple // Дозволяє вибирати кілька файлів
            accept="image/*" // Приймаємо тільки зображення
            hidden // Ховаємо стандартний інпут
          />
          {/* Кастомна кнопка для вибору файлів */}
          <label
            htmlFor="images"
            className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition cursor-pointer text-sm"
          >
            <FaUpload />
            Обрати нові зображення
          </label>
        </fieldset>

        {/* Поля форми */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {" "}
          {/* Адаптивна сітка */}
          {/* Назва */}
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="name"
              className="text-base font-medium text-gray-900"
            >
              Назва товару <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              onChange={onChangeHandler}
              value={data.name}
              name="name"
              type="text"
              placeholder='Наприклад, "Вишиванка Оберіг"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          {/* Ціна */}
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="price"
              className="text-base font-medium text-gray-900"
            >
              Ціна (грн) <span className="text-red-500">*</span>
            </label>
            <input
              id="price"
              onChange={onChangeHandler}
              value={data.price}
              type="number"
              name="price"
              placeholder="Наприклад, 1500"
              min="0" // Ціна не може бути від'ємною
              step="0.01" // Для копійок
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          {/* Опис */}
          <div className="flex flex-col gap-y-1 md:col-span-2">
            {" "}
            {/* Займає всю ширину */}
            <label
              htmlFor="description"
              className="text-base font-medium text-gray-900"
            >
              Опис <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              onChange={onChangeHandler}
              value={data.description}
              name="description"
              rows={4}
              placeholder="Детальний опис товару..."
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px] transition duration-150 ease-in-out"
            ></textarea>
          </div>
          {/* Категорія */}
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="category"
              className="text-base font-medium text-gray-900"
            >
              Категорія <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              onChange={onChangeHandler}
              value={data.category}
              name="category"
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white" // Додав bg-white
            >
              {/* <option value="Оберіть категорію" disabled>-- Оберіть категорію --</option> */}
              <option value="Для жінок">Для жінок</option>
              <option value="Для чоловіків">Для чоловіків</option>
              <option value="Аксесуари">Аксесуари</option>
              <option value="Інше">Інше</option>
            </select>
          </div>
          {/* Інші характеристики */}
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="threads"
              className="text-base font-medium text-gray-900"
            >
              Нитки
            </label>
            <input
              id="threads"
              onChange={onChangeHandler}
              value={data.threads}
              type="text"
              name="threads"
              placeholder='Наприклад, "Бавовна, акрил"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="cut"
              className="text-base font-medium text-gray-900"
            >
              Крій
            </label>
            <input
              id="cut"
              onChange={onChangeHandler}
              value={data.cut}
              type="text"
              name="cut"
              placeholder='Наприклад, "Прямий, вільний"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="technique"
              className="text-base font-medium text-gray-900"
            >
              Техніка виконання
            </label>
            <input
              id="technique"
              onChange={onChangeHandler}
              value={data.technique}
              type="text"
              name="technique"
              placeholder='Наприклад, "Хрестик, гладь"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="fabric"
              className="text-base font-medium text-gray-900"
            >
              Тканина
            </label>
            <input
              id="fabric"
              onChange={onChangeHandler}
              value={data.fabric}
              type="text"
              name="fabric"
              placeholder='Наприклад, "Льон, домоткане полотно"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <label
              htmlFor="colors"
              className="text-base font-medium text-gray-900"
            >
              Кольори <span className="text-red-500">*</span>
            </label>
            <input
              id="colors"
              onChange={onChangeHandler}
              value={data.colors}
              type="text"
              name="colors"
              placeholder='Наприклад, "Червоний, чорний, білий"'
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>
        </div>

        {/* Блок для розмірів та кількості (тільки для перегляду) */}
        <fieldset className="border border-gray-300 p-4 rounded-md mt-4">
          <legend className="text-base font-medium px-2 text-gray-900">
            Наявні розміри та кількість
          </legend>
          {sizes.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {" "}
              {/* Використовуємо flex-wrap */}
              {sizes.map((sizeInfo, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center p-2 rounded border border-gray-200"
                >
                  <span className="text-base font-medium text-gray-900">
                    Розмір:
                  </span>
                  <input
                    type="text"
                    value={sizeInfo.size}
                    readOnly
                    className="border border-gray-300 rounded py-1 px-2 outline-none bg-gray-200 w-20 text-center cursor-not-allowed text-sm"
                  />
                  <span className="text-base font-medium text-gray-900">
                    К-сть:
                  </span>
                  <input
                    type="number"
                    value={sizeInfo.quantity}
                    readOnly
                    className="border border-gray-300 rounded py-1 px-2 outline-none bg-gray-200 w-20 text-center cursor-not-allowed text-sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 italic">
              Розміри для цього товару ще не додані.
            </p>
          )}
        </fieldset>

        {/* Кнопка збереження змін */}
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
          >
            <FaSave />
            Зберегти зміни
          </button>
        </div>
      </form>
    </section>
  );
};

export default Edit;

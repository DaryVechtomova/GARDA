import React, { useState, useRef, useEffect } from "react";
// import upload_area from "../assets/upload_area1.svg"; // Можна видалити, якщо не використовується плейсхолдер-зображення
import { FaPlus, FaTrash, FaUpload, FaArrowLeft } from "react-icons/fa"; // Додав FaUpload, FaTrash
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Flower from "../assets/design/flower.png";

const Add = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const url = "http://localhost:4000"; // URL вашого бекенду
  const [images, setImages] = useState([]); // Стан для зберігання об'єктів File
  const navigate = useNavigate();
  const [data, setData] = useState({
    name: "",
    description: "",
    price: "",
    category: "", // Встановлюємо початкове значення за замовчуванням
    threads: "",
    cut: "",
    technique: "",
    fabric: "",
    colors: "",
  });
  // Змінив початкове значення кількості на 1
  const [sizes, setSizes] = useState([{ size: "", quantity: "0" }]);
  const fileInputRef = useRef(null); // Реф для скидання значення інпуту файлів

  // Список стандартних розмірів
  const sizesList = [
    "One size",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
  ];

  // --- Обробники подій ---

  // Обробник зміни полів форми (name, description, price, etc.)
  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Обробник зміни полів в рядку розміру/кількості
  const handleSizeChange = (index, event) => {
    const { name, value } = event.target;
    const newSizes = [...sizes];
    // Дозволяємо вводити 0 або більше для кількості
    if (name === "quantity" && value !== "" && parseInt(value) < 0) {
      toast.warn("Кількість не може бути від'ємною.");
      return; // Не оновлюємо, якщо значення некоректне
    }
    newSizes[index][name] = value;
    setSizes(newSizes);
  };

  // Додавання нового поля для розміру/кількості
  const addSizeField = () => {
    // Додаємо новий рядок з порожнім розміром та кількістю 1
    setSizes([...sizes, { size: "", quantity: "0" }]);
  };

  // Видалення поля для розміру/кількості
  const removeSizeField = (index) => {
    // Залишаємо хоча б один рядок
    if (sizes.length <= 1) {
      toast.info("Повинен бути хоча б один розмір.");
      return;
    }
    const newSizes = sizes.filter((_, i) => i !== index);
    setSizes(newSizes);
  };

  // Обробник вибору зображень
  const handleImageChange = (event) => {
    const files = Array.from(event.target.files);
    // Проста валідація типів файлів
    const validImageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );
    if (validImageFiles.length !== files.length) {
      toast.warn(
        "Було обрано файли, що не є зображеннями. Вони були проігноровані."
      );
    }
    setImages((prevImages) => [...prevImages, ...validImageFiles]);

    // Скидаємо значення input type="file", щоб можна було вибрати той самий файл знову
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Видалення зображення зі списку прев'ю
  const removeImage = (indexToRemove) => {
    setImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  // --- Відправка форми ---
  const onSubmitHandler = async (event) => {
    event.preventDefault();

    // --- Формування FormData ---
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", Number(data.price));
    formData.append("category", data.category);
    formData.append("threads", data.threads);
    formData.append("cut", data.cut);
    formData.append("technique", data.technique);
    formData.append("fabric", data.fabric);
    formData.append("colors", data.colors);

    sizes.forEach((size, index) => {
      formData.append(`sizes[${index}][size]`, size.size);
      formData.append(`sizes[${index}][quantity]`, size.quantity);
    });

    images.forEach((image) => {
      formData.append("images", image);
    });

    // --- Відправка запиту ---
    try {
      const response = await axios.post(
        `${url}/api/product/add-product`,
        formData,
        {
          // Headers for multipart/form-data are usually set automatically by axios
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Товар успішно додано!");
        // Скидання форми
        setData({
          name: "",
          description: "",
          price: "",
          category: "Для жінок",
          threads: "",
          cut: "",
          technique: "",
          fabric: "",
          colors: "",
        });
        setSizes([{ size: "", quantity: "0" }]); // Повертаємо до одного рядка
        setImages([]); // Очищаємо прев'ю зображень
        // Скидаємо значення input type="file" остаточно
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(
          response.data.message || "Не вдалося додати товар (помилка сервера)."
        );
      }
    } catch (error) {
      console.error("Помилка додавання товару:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Сталася помилка мережі або сервера.";
      toast.error(`Помилка: ${errorMessage}`);
    }
  };

  // --- JSX Рендеринг ---
  return (
    <section className="p-16 w-full bg-gray-100 min-h-screen flex justify-center">
      <form
        onSubmit={onSubmitHandler}
        className="flex flex-col gap-y-5 max-w-4xl w-full mx-auto bg-white p-6 rounded-lg shadow-md"
      >
        <div className="flex items-center justify-center">
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
            Додавання нового товару
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
                    Додавання нового товару
                </h4> */}

        {/* Завантаження та управління зображеннями */}
        <fieldset className="border border-gray-300 p-4 rounded-md">
          <legend className="text-base font-medium px-2 text-gray-900">
            Зображення товару <span className="text-red-500">*</span>
          </legend>

          {/* Контейнер для прев'ю */}
          <div className="flex flex-wrap gap-3 mb-3 min-h-[110px] p-2 border border-dashed border-gray-300 rounded-md ">
            {images.map((imageFile, index) => (
              <div key={`new-${index}`} className="relative group">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt={`Нове зображення ${index + 1}`}
                  className="h-24 w-24 object-cover rounded-md border border-blue-300 shadow-sm"
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Очищаємо URL після завантаження
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  title="Видалити це зображення"
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
                >
                  &times;
                </button>
              </div>
            ))}
            {/* Повідомлення, якщо немає зображень */}
            {images.length === 0 && (
              <div className="flex items-center justify-center h-24 w-full text-gray-300">
                <p>Перетягніть або оберіть зображення...</p>
              </div>
            )}
          </div>

          {/* Прихований інпут для файлів */}
          <input
            onChange={handleImageChange}
            type="file"
            id="images"
            multiple // Дозволяє вибирати кілька файлів
            accept="image/*" // Приймаємо тільки зображення
            hidden // Ховаємо стандартний інпут
            ref={fileInputRef} // Підключаємо реф
          />
          {/* Кастомна кнопка для вибору файлів */}
          <label
            htmlFor="images"
            className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition cursor-pointer text-sm"
          >
            <FaUpload />
            Обрати зображення
          </label>
        </fieldset>

        {/* Поля форми */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
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
              min="0.01"
              step="0.01"
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
            />
          </div>

          {/* Опис */}
          <div className="flex flex-col gap-y-1 md:col-span-2">
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
              className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
            >
              <option value="" disabled>
                -- Оберіть --
              </option>
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

        {/* Блок для розмірів та кількості */}
        <fieldset className="border border-gray-300 p-4 rounded-md mt-4">
          <legend className="text-base font-medium px-2 text-gray-900">
            Розміри та початкова кількість{" "}
            <span className="text-red-500">*</span>
          </legend>
          <div className="flex flex-col gap-y-3">
            {sizes.map((sizeItem, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2 rounded border border-gray-200"
              >
                {/* Розмір */}
                <div className="flex flex-col gap-y-1 flex-grow sm:flex-grow-0 sm:w-40">
                  <label
                    htmlFor={`size-${index}`}
                    className="text-xs font-medium text-gray-500"
                  >
                    Розмір
                  </label>
                  <select
                    id={`size-${index}`}
                    name="size" // Важливо для handleSizeChange
                    value={sizeItem.size}
                    onChange={(e) => handleSizeChange(index, e)}
                    className="border border-gray-300 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm w-full"
                  >
                    <option value="" disabled>
                      -- Оберіть --
                    </option>
                    {sizesList.map((sizeOption, i) => (
                      <option key={i} value={sizeOption}>
                        {sizeOption}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Кількість */}
                <div className="flex flex-col gap-y-1 flex-grow sm:flex-grow-0 sm:w-28">
                  <label
                    htmlFor={`quantity-${index}`}
                    className="text-xs font-medium text-gray-500"
                  >
                    Кількість
                  </label>
                  <input
                    id={`quantity-${index}`}
                    type="number"
                    name="quantity"
                    placeholder="К-сть"
                    value={0}
                    onChange={(e) => {}}
                    min="0"
                    readOnly
                    className="border border-gray-300 rounded-md py-1.5 px-2 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out text-sm w-full"
                  />
                </div>
                {/* Кнопка видалення */}
                <button
                  type="button"
                  onClick={() => removeSizeField(index)}
                  title="Видалити цей розмір"
                  // Робимо неактивною, якщо це останній рядок
                  disabled={sizes.length <= 1}
                  className={`ml-auto mt-4 sm:mt-0 self-end px-2 py-2 bg-[#99120d] text-white rounded-md ${
                    sizes.length > 1
                      ? "hover:[#7a0e0a] cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  } transition-all`}
                >
                  &times;
                </button>
              </div>
            ))}
            {/* Кнопка додавання розміру */}
            <button
              type="button"
              onClick={addSizeField}
              className="mt-2 inline-flex items-center justify-center gap-x-1 px-3 py-1.5 bg-blue-500 text-white font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition text-sm self-start" // self-start для вирівнювання
            >
              <FaPlus size={12} /> Додати розмір
            </button>
          </div>
        </fieldset>

        {/* Кнопка додавання товару */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)} // Кнопка Назад/Скасувати
            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md transition text-sm"
          >
            <FaArrowLeft /> Скасувати
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
          >
            <FaPlus />
            Додати товар
          </button>
        </div>
      </form>
    </section>
  );
};

export default Add;

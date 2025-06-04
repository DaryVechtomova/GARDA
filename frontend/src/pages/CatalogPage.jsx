import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import Item from "../components/Item";
import { ShopContext } from "../context/ShopContext";
import { IoOptionsOutline } from "react-icons/io5";
import { HiX } from "react-icons/hi";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import Flower from "../assets/design/flower.png";

const CatalogPage = () => {
  const { category: categorySlug } = useParams();
  const { all_products } = useContext(ShopContext);
  console.log("CatalogPage: Initial all_products from context:", all_products);

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [selectedSizes, setSelectedSizes] = useState(new Set());

  const [pageTitle, setPageTitle] = useState("Каталог товарів");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // СТАНИ ДЛЯ СОРТУВАННЯ
  const [sortOption, setSortOption] = useState("default"); // Поточний вибраний варіант сортування
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false); // Для відкриття/закриття випадаючого списку сортування

  const categoryNameMap = {
    women: "Для жінок",
    men: "Для чоловіків",
    accessories: "Аксесуари",
  };
  const getCategoryNameFromSlug = (slug) => {
    if (slug === "all" || !slug) return "All";
    return categoryNameMap[slug?.toLowerCase()] || null;
  };
  const getPageTitle = (slug) => {
    switch ((slug || "all").toLowerCase()) {
      case "women":
        return "Товари для жінок";
      case "men":
        return "Товари для чоловіків";
      case "accessories":
        return "Аксесуари";
      case "all":
        return "Каталог товарів";
      default:
        return "Каталог товарів";
    }
  };

  // --- Ефект для вилучення доступних кольорів та розмірів ---
  useEffect(() => {
    console.log("Extracting filters useEffect: Running...");
    if (all_products && all_products.length > 0) {
      const colorsSet = new Set();
      const sizesSet = new Set();

      all_products.forEach((product) => {
        if (product.colors && typeof product.colors === "string") {
          colorsSet.add(product.colors.trim());
        }
        if (product.sizes && Array.isArray(product.sizes)) {
          product.sizes.forEach((sizeObj) => {
            if (sizeObj.size && typeof sizeObj.size === "string") {
              sizesSet.add(sizeObj.size.trim());
            }
          });
        }
      });

      // СОРТУВАННЯ КОЛЬОРІВ (за алфавітом - залишається без змін)
      const sortedColors = Array.from(colorsSet).sort((a, b) => {
        const nameA = a.toUpperCase();
        const nameB = b.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      // СОРТУВАННЯ РОЗМІРІВ (ОНОВЛЕНА ЛОГІКА)
      const desiredSizeOrder = [
        // Чітко визначаємо бажаний порядок
        "ONE SIZE", // Або "УНІВЕРСАЛЬНИЙ", якщо використовуєш такий варіант
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
        "XXXL",
        // Додай сюди інші розміри, якщо вони є і мають бути в певному порядку
      ];

      const sortedSizes = Array.from(sizesSet).sort((a, b) => {
        const aUpper = a.toUpperCase(); // Переводимо в верхній регістр для порівняння
        const bUpper = b.toUpperCase();

        let indexA = desiredSizeOrder.indexOf(aUpper);
        let indexB = desiredSizeOrder.indexOf(bUpper);

        // Якщо розмір 'a' не знайдено в desiredSizeOrder, намагаємось обробити його як число
        if (indexA === -1) {
          const numA = parseFloat(aUpper);
          // Якщо 'a' - число, даємо йому високий індекс, щоб він був після стандартних розмірів,
          // але перед іншими невідомими текстовими розмірами.
          // Числа сортуватимуться між собою.
          if (!isNaN(numA)) {
            indexA = desiredSizeOrder.length + numA; // Наприклад, "36" матиме індекс ~8 + 36 = 44
          } else {
            indexA = Infinity; // Невідомі текстові розміри йдуть в самий кінець
          }
        }

        // Те саме для розміру 'b'
        if (indexB === -1) {
          const numB = parseFloat(bUpper);
          if (!isNaN(numB)) {
            indexB = desiredSizeOrder.length + numB;
          } else {
            indexB = Infinity;
          }
        }

        return indexA - indexB;
      });

      console.log("Extracting filters: Sorted Colors:", sortedColors);
      console.log("Extracting filters: Sorted Sizes:", sortedSizes);

      setAvailableColors(sortedColors);
      setAvailableSizes(sortedSizes);
    } else {
      setAvailableColors([]);
      setAvailableSizes([]);
    }
  }, [all_products]);

  // --- Основний ефект для фільтрації ТА СОРТУВАННЯ товарів ---
  useEffect(() => {
    console.log("Filtering and Sorting products useEffect: Running...");
    console.log("Dependencies changed:", {
      categorySlug,
      all_products_count: all_products?.length,
      selectedColors_size: selectedColors.size,
      selectedSizes_size: selectedSizes.size,
      sortOption,
    }); // Додали sortOption

    setPageTitle(getPageTitle(categorySlug));

    if (all_products && all_products.length > 0) {
      const categoryNameToFilterBy = getCategoryNameFromSlug(categorySlug);

      // 1. Фільтрація (твій код без змін)
      let categoryFiltered = [];
      if (categoryNameToFilterBy === "All") {
        categoryFiltered = all_products;
      } else if (categoryNameToFilterBy) {
        categoryFiltered = all_products.filter(
          (product) =>
            product.category &&
            product.category.toLowerCase() ===
              categoryNameToFilterBy.toLowerCase()
        );
      } else {
        categoryFiltered = all_products;
      }

      let colorFiltered = categoryFiltered;
      if (selectedColors.size > 0) {
        colorFiltered = categoryFiltered.filter(
          (product) =>
            product.colors &&
            typeof product.colors === "string" &&
            selectedColors.has(product.colors.trim())
        );
      }

      let sizeFiltered = colorFiltered;
      if (selectedSizes.size > 0) {
        sizeFiltered = colorFiltered.filter(
          (product) =>
            product.sizes &&
            Array.isArray(product.sizes) &&
            product.sizes.some(
              (sizeObj) =>
                sizeObj.size &&
                typeof sizeObj.size === "string" &&
                selectedSizes.has(sizeObj.size.trim())
            )
        );
      }

      // 2. СОРТУВАННЯ ВІДФІЛЬТРОВАНИХ ТОВАРІВ
      let sortedAndFilteredProducts = [...sizeFiltered]; // Робимо копію, щоб не мутувати оригінальний масив

      switch (sortOption) {
        case "price_asc": // Ціною зростання
          sortedAndFilteredProducts.sort((a, b) => {
            const priceA =
              a.discount > 0 ? a.price * (1 - a.discount / 100) : a.price;
            const priceB =
              b.discount > 0 ? b.price * (1 - b.discount / 100) : b.price;
            return priceA - priceB;
          });
          break;
        case "price_desc": // Ціною падіння
          sortedAndFilteredProducts.sort((a, b) => {
            const priceA =
              a.discount > 0 ? a.price * (1 - a.discount / 100) : a.price;
            const priceB =
              b.discount > 0 ? b.price * (1 - b.discount / 100) : b.price;
            return priceB - priceA;
          });
          break;
        // case "newest": // Якщо захочеш додати "Новинки", потрібне поле дати додавання в моделі товару
        //     sortedAndFilteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Приклад, якщо є поле createdAt
        //     break;
        case "default":
        default:
          // За замовчуванням можна не сортувати додатково, або сортувати за якоюсь властивістю,
          // наприклад, за іменем або порядком з БД (якщо він є)
          // Для прикладу, залишимо як є (порядок після фільтрації)
          // або можна додати сортування за _id, якщо товари приходять в різному порядку
          // sortedAndFilteredProducts.sort((a, b) => a.name.localeCompare(b.name)); // Сортування за іменем як приклад
          break;
      }

      console.log(
        "Final sorted and filtered products count:",
        sortedAndFilteredProducts.length
      );
      setFilteredProducts(sortedAndFilteredProducts);
    } else {
      console.log("Filtering products useEffect: No base products to filter.");
      setFilteredProducts([]);
    }
  }, [categorySlug, all_products, selectedColors, selectedSizes, sortOption]);

  // --- Обробники зміни фільтрів ---
  const handleColorChange = (color) => {
    console.log("handleColorChange:", color); // DEBUG
    setSelectedColors((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(color)) {
        newSelected.delete(color);
      } else {
        newSelected.add(color);
      }
      console.log("New selectedColors:", newSelected); // DEBUG
      return newSelected;
    });
  };

  const handleSizeChange = (size) => {
    console.log("handleSizeChange:", size); // DEBUG
    setSelectedSizes((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(size)) {
        newSelected.delete(size);
      } else {
        newSelected.add(size);
      }
      console.log("New selectedSizes:", newSelected); // DEBUG
      return newSelected;
    });
  };

  const clearFilters = () => {
    console.log("Clearing filters"); // DEBUG
    setSelectedColors(new Set());
    setSelectedSizes(new Set());
    setIsFilterOpen(false);
  };

  const toggleFilterPanel = () => {
    // Функція для кнопки
    console.log("Toggling filter panel"); // DEBUG
    setIsFilterOpen((prev) => !prev);
  };

  // ФУНКЦІЯ ДЛЯ ЗМІНИ СОРТУВАННЯ
  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortDropdownOpen(false); // Закриваємо випадаючий список після вибору
    console.log("Sort option changed to:", option);
  };

  // ФУНКЦІЯ ДЛЯ ВІДКРИТТЯ/ЗАКРИТТЯ ВИПАДАЮЧОГО СПИСКУ СОРТУВАННЯ
  const toggleSortDropdown = () => {
    setIsSortDropdownOpen((prev) => !prev);
  };

  // --- КОНСТАНТИ ДЛЯ ПОЗИЦІОНУВАННЯ КНОПКИ ФІЛЬТРІВ ---
  const HEADER_HEIGHT_PLUS_OFFSET = "75px";

  // Відступ кнопки фільтрів зліва. Має відповідати відступу кнопки "Меню" в хедері.
  const FILTER_BUTTON_LEFT_MARGIN = "1rem";

  // ВІДСТУП КНОПКИ СОРТУВАННЯ СПРАВА (має відповідати відступу кнопки "Профіль")
  const SORT_BUTTON_RIGHT_MARGIN = "2rem";

  // --- Код для відступів та ширини вікна (без змін) ---
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const interpolate = (value, x1, y1, x2, y2) =>
    y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
  const calculateMarginTop = () => interpolate(windowWidth, 600, 40, 1540, 80);

  return (
    <>
      <section
        id="catalog-page"
        className="max-w-screen-xl mx-auto py-10 min-h-[70vh] flex flex-col px-4 sm:px-6 lg:px-8 relative"
        style={{
          paddingTop: "6rem",
          paddingBottom: "100px",
        }}
      >
        {/* --- КНОПКА ВІДКРИТТЯ ФІЛЬТРІВ --- */}
        <div
          className="fixed flex flex-col items-center gap-1 cursor-pointer z-20 p-2 pt-8  "
          style={{
            top: HEADER_HEIGHT_PLUS_OFFSET,
            left: FILTER_BUTTON_LEFT_MARGIN,
          }}
          onClick={toggleFilterPanel}
        >
          <IoOptionsOutline className="text-2xl hover:text-secondary sm:text-3xl" />
          <span className="text-sm hidden sm:block">Фільтрувати</span>
        </div>

        {/* Заголовок сторінки з квітками */}
        <div className="flex items-center justify-center mb-5 md:mb-5">
          <img
            src={Flower}
            alt=""
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain mr-2 sm:mr-3 md:mr-4 transform translate-y-[10px]"
          />
          <h2
            style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
            className="text-xl sm:text-2xl md:text-3xl text-center text-black"
          >
            {getPageTitle()}
          </h2>
          <img
            src={Flower}
            alt=""
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain ml-2 sm:ml-3 md:ml-4 transform translate-y-[10px]"
          />
        </div>

        {/* --- КНОПКА ВІДКРИТТЯ СОРТУВАННЯ --- */}
        <button // Змінив div на button для кращої семантики та доступності
          type="button" // Явно вказуємо тип кнопки
          className="fixed flex items-center justify-center gap-x-2 cursor-pointer z-20 bg-white px-3 py-2 rounded-md  text-sm font-medium focus:outline-none pt-8"
          style={{
            top: HEADER_HEIGHT_PLUS_OFFSET,
            right: SORT_BUTTON_RIGHT_MARGIN,
          }}
          onClick={toggleSortDropdown}
        >
          {/* Текст кнопки */}
          <span className="hidden sm:inline">Сортувати</span>
          {/* Іконка-стрілка */}
          {isSortDropdownOpen ? (
            <IoIosArrowUp className="text-2xl h-5 w-5 " /> // Змінив розмір іконки для кращого вигляду
          ) : (
            <IoIosArrowDown className="text-2xl h-5 w-5 " /> // Змінив розмір іконки
          )}
        </button>

        {/* --- ВИПАДАЮЧИЙ СПИСОК ОПЦІЙ СОРТУВАННЯ (окремо від кнопки) --- */}
        {isSortDropdownOpen && (
          <div
            className="fixed bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-30 p-4 w-64" // Змінив py-1 на p-4, w-60 на w-64
            style={{
              top: `calc(${HEADER_HEIGHT_PLUS_OFFSET} + 55px)`, // Трохи нижче кнопки (55px - приблизна висота кнопки + невеликий відступ)
              right: SORT_BUTTON_RIGHT_MARGIN, // Вирівнюємо по правому краю кнопки
            }}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {/* Заголовок для списку сортування (схожий на панель фільтрів) */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b">
              {" "}
              {/* Зменшив mb і pb */}
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: "Montserrat Alternates" }}
              >
                Впорядкувати за
              </h3>
              {/* Можна додати кнопку X для закриття, якщо потрібно, хоча зазвичай випадаючі списки закриваються по кліку на опцію або поза ним */}
              {/* <button onClick={toggleSortDropdown} className="text-xl text-gray-500 hover:text-gray-800">
                                <HiX />
                            </button> */}
            </div>

            {/* Опції сортування зі стилями, схожими на фільтри */}
            <div className="space-y-3">
              {" "}
              {/* Додав space-y-3 для більших проміжків */}
              <label // Тепер це label, щоб можна було клікати по тексту
                onClick={() => handleSortChange("price_asc")}
                className={`flex items-center cursor-pointer text-sm text-gray-700 p-2 rounded-md hover:bg-gray-100 ${
                  sortOption === "price_asc" ? "bg-gray-100 font-semibold" : ""
                }`}
                role="menuitem" // role все ще корисний
              >
                <input
                  type="radio"
                  name="sort_option_display" // Змінив name, щоб уникнути конфлікту з невидимими радіо для логіки
                  value="price_asc"
                  checked={sortOption === "price_asc"}
                  readOnly // Залишаємо readOnly, оскільки клік обробляється на label
                  className="mr-3 h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500" // Стилі для радіокнопки
                />
                <span className="align-middle">Ціною за зростанням</span>
              </label>
              <label
                onClick={() => handleSortChange("price_desc")}
                className={`flex items-center cursor-pointer text-sm text-gray-700 p-2 rounded-md hover:bg-gray-100 ${
                  sortOption === "price_desc" ? "bg-gray-100 font-semibold" : ""
                }`}
                role="menuitem"
              >
                <input
                  type="radio"
                  name="sort_option_display"
                  value="price_desc"
                  checked={sortOption === "price_desc"}
                  readOnly
                  className="mr-3 h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="align-middle">Ціною за спаданням</span>
              </label>
              <label
                onClick={() => handleSortChange("default")}
                className={`flex items-center cursor-pointer text-sm text-gray-700 p-2 rounded-md hover:bg-gray-100 ${
                  sortOption === "default" ? "bg-gray-100 font-semibold" : ""
                }`}
                role="menuitem"
              >
                <input
                  type="radio"
                  name="sort_option_display"
                  value="default"
                  checked={sortOption === "default"}
                  readOnly
                  className="mr-3 h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="align-middle">За замовчуванням</span>
              </label>
            </div>
          </div>
        )}

        {/* --- ОСНОВНИЙ КОНТЕНТ --- */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 flex-grow">
            {filteredProducts.map((product) => (
              <div key={product._id} className="flex justify-center">
                <Item product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center min-h-[40vh]">
            {/* Показуємо різний текст залежно від того, чи є базові товари */}
            {all_products && all_products.length > 0 ? (
              <p className="text-center text-lg">
                Товарів за обраними фільтрами не знайдено.
              </p>
            ) : (
              <p className="text-center text-lg">Завантаження товарів...</p>
            )}
          </div>
        )}
      </section>

      {/* --- ПАНЕЛЬ ФІЛЬТРІВ (Sidebar) --- */}
      {/* Перевіряємо isFilterOpen */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={toggleFilterPanel} // Закриваємо по кліку на фон
        >
          <div
            className="fixed top-0 left-0 h-full w-72 md:w-80 bg-white shadow-xl z-50 p-6 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок панелі та кнопка закриття */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3
                className="text-xl font-semibold"
                style={{ fontFamily: "Montserrat Alternates" }}
              >
                Фільтри
              </h3>
              <button
                onClick={toggleFilterPanel}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                {" "}
                {/* Закриваємо */}
                <HiX />
              </button>
            </div>

            {/* Секція кольорів */}
            <div className="mb-6">
              <h4
                className="text-lg font-medium mb-3"
                style={{ fontFamily: "Montserrat Alternates" }}
              >
                Кольори
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {availableColors.length > 0 ? (
                  availableColors.map((color) => (
                    <label
                      key={color}
                      className="flex items-center cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        value={color}
                        checked={selectedColors.has(color)}
                        onChange={() => handleColorChange(color)}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {color || "Не вказано"}{" "}
                      {/* Додано перевірку на порожній рядок */}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Немає доступних</p>
                )}
              </div>
            </div>

            {/* Секція розмірів */}
            <div className="mb-6">
              <h4
                className="text-lg font-medium mb-3"
                style={{ fontFamily: "Montserrat Alternates" }}
              >
                Розміри
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {availableSizes.length > 0 ? (
                  availableSizes.map((size) => (
                    <label
                      key={size}
                      className="flex items-center cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        value={size}
                        checked={selectedSizes.has(size)}
                        onChange={() => handleSizeChange(size)}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {size || "Не вказано"}{" "}
                      {/* Додано перевірку на порожній рядок */}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Немає доступних</p>
                )}
              </div>
            </div>

            {/* Кнопка очищення фільтрів */}
            <div className="mt-auto pt-4 border-t">
              <button
                onClick={clearFilters}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Очистити фільтри
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CatalogPage;

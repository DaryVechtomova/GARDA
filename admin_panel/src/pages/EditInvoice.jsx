import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaSave,
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaSpinner,
  FaMinus,
  FaPlusCircle,
} from "react-icons/fa"; // Додав FaMinus, FaPlusCircle
import Select from "react-select"; // Використовуємо react-select
import Flower from "../assets/design/flower.png";

const EditInvoice = () => {
  const url = "http://localhost:4000";
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    _id: id,
    supplier: "",
    products: [],
    totalAmount: 0,
    notes: "",
    status: "активна",
    invoiceNumber: "", // Додав поле для номера накладної
  });

  // Стани для секції "Додати товар"
  const [productToAdd, setProductToAdd] = useState(null);
  const [sizeToAdd, setSizeToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [pricePerUnitToAdd, setPricePerUnitToAdd] = useState(0);
  // const [addStockError, setAddStockError] = useState(""); // Прибрав, оскільки перевірки стоку тут немає

  // --- Завантаження даних ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [suppliersRes, productsRes, invoiceRes] = await Promise.all([
          axios.get(`${url}/api/suppliers/list-supplier`),
          axios.get(`${url}/api/product/list-product`),
          // Змінив ендпоінт для отримання даних накладної
          axios.get(`${url}/api/invoices/edit-invoice/${id}`), // Використовуємо details
        ]);

        // Обробка постачальників
        if (suppliersRes.data.success) {
          setSuppliers(suppliersRes.data.data);
        } else {
          toast.error("Помилка завантаження постачальників");
        }

        // Обробка товарів
        if (productsRes.data.success) {
          setProducts(productsRes.data.data);
        } else {
          toast.error("Помилка завантаження товарів");
        }

        // Обробка накладної
        if (invoiceRes.data.success && invoiceRes.data.data) {
          const fetchedInvoice = invoiceRes.data.data;
          // Перевіряємо чи є масив productsRes.data.data перед використанням find
          const safeProducts = Array.isArray(productsRes.data.data)
            ? productsRes.data.data
            : [];

          const populatedProducts = fetchedInvoice.products.map((item) => {
            const productDetails = safeProducts.find(
              (p) => p._id === item.product
            );
            return {
              ...item,
              name: productDetails ? productDetails.name : "Невідомий товар",
              pricePerUnit: Number(item.pricePerUnit) || 0,
              quantity: Number(item.quantity) || 1,
            };
          });

          setInvoiceData({
            ...fetchedInvoice,
            products: populatedProducts,
            totalAmount: Number(fetchedInvoice.totalAmount) || 0,
            supplier:
              fetchedInvoice.supplier?._id || fetchedInvoice.supplier || "", // Беремо ID постачальника
            invoiceNumber: fetchedInvoice.invoiceNumber || "", // Номер накладної
          });
        } else {
          toast.error(
            invoiceRes.data.message || "Помилка завантаження накладної"
          );
          setInvoiceData(null);
        }
      } catch (error) {
        toast.error("Не вдалося отримати дані для редагування");
        console.error("Fetch data error:", error);
        setInvoiceData(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    } else {
      toast.error("ID накладної не вказано.");
      navigate("/admin_panel/list-invoice");
      setLoading(false); // Зупиняємо завантаження
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, url]); // Видалено navigate з залежностей

  // Фільтрація товарів за типом постачальника
  const filteredProductsOptions = useMemo(() => {
    if (
      !invoiceData?.supplier ||
      suppliers.length === 0 ||
      products.length === 0
    )
      return [];
    const supplier = suppliers.find((s) => s._id === invoiceData.supplier);
    if (!supplier) return [];

    let allowedCategories = [];
    if (supplier.productType === "одяг") {
      allowedCategories = ["Для чоловіків", "Для жінок"];
    } else if (supplier.productType === "аксесуари") {
      allowedCategories = ["Аксесуари"];
    } else {
      allowedCategories = ["Інше"];
    }

    return products
      .filter(
        (product) =>
          product.category && allowedCategories.includes(product.category)
      )
      .map((product) => ({
        value: product._id,
        label: `${product.name} (ID: ${product._id.slice(-6)})`,
      }));
  }, [invoiceData?.supplier, suppliers, products]);

  // Доступні розміри для вибраного товару
  const availableSizesForSelectedProduct = useMemo(() => {
    if (!productToAdd?.value) return [];
    const product = products.find((p) => p._id === productToAdd.value);
    return product?.sizes?.filter((s) => s.quantity !== undefined) || [];
  }, [productToAdd, products]);

  // Перерахунок загальної суми
  const recalculateTotalAmount = useCallback((items) => {
    const newTotal = items.reduce((sum, item) => {
      return (
        sum + (Number(item.quantity) || 0) * (Number(item.pricePerUnit) || 0)
      );
    }, 0);
    // Використовуємо функціональне оновлення стану
    setInvoiceData((prev) => {
      // Перевіряємо, чи дійсно сума змінилася, щоб уникнути зайвих ререндерів
      if (prev && prev.totalAmount !== newTotal) {
        return { ...prev, totalAmount: newTotal };
      }
      return prev; // Повертаємо попередній стан, якщо сума не змінилася
    });
  }, []); // Пустий масив залежностей, оскільки функція не залежить від зовнішніх змінних, крім параметру items

  // Обробник зміни полів самої накладної (notes, status)
  const handleInvoiceDataChange = (event) => {
    const { name, value } = event.target;
    setInvoiceData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Обробники для секції "Додати товар" ---
  const handleProductToAddChange = (selectedOption) => {
    setProductToAdd(selectedOption);
    setSizeToAdd("");
    setQuantityToAdd(1);
    // setAddStockError(""); // Прибрав, сток не перевіряємо

    if (selectedOption?.value) {
      const product = products.find((p) => p._id === selectedOption.value);
      if (product && typeof product.price === "number") {
        const calculatedPrice = product.price * 0.25; // Ваша логіка ціни
        setPricePerUnitToAdd(calculatedPrice);
      } else {
        setPricePerUnitToAdd(0);
      }
    } else {
      setPricePerUnitToAdd(0);
    }
  };

  const handleSizeToAddChange = (e) => {
    setSizeToAdd(e.target.value);
    setQuantityToAdd(1);
  };

  const handleQuantityToAddChange = (e) => {
    const value = e.target.value;
    if (value === "") {
      setQuantityToAdd("");
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1) {
      setQuantityToAdd(numValue);
    } else if (!isNaN(numValue) && numValue <= 0) {
      setQuantityToAdd("");
    }
  };

  const handleQuantityToAddBlur = () => {
    const numValue = parseInt(quantityToAdd, 10);
    if (isNaN(numValue) || numValue <= 0) {
      setQuantityToAdd(1);
    }
  };

  // --- Додавання товару до списку ---
  const handleAddProductToList = () => {
    if (!productToAdd?.value) {
      toast.error("Оберіть товар");
      return;
    }
    if (!sizeToAdd) {
      toast.error("Оберіть розмір");
      return;
    }
    const quantityNum = parseInt(quantityToAdd, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Введіть коректну кількість (>0)");
      return;
    }
    if (pricePerUnitToAdd < 0) {
      toast.warn("Ціна за одиницю не може бути від'ємною.");
    } // Додав перевірку на від'ємну ціну

    const productDetails = products.find((p) => p._id === productToAdd.value);
    if (!productDetails) {
      toast.error("Помилка: Деталі товару не знайдено");
      return;
    }

    const existingItemIndex = invoiceData.products.findIndex(
      (item) => item.product === productToAdd.value && item.size === sizeToAdd
    );

    let updatedItems;
    if (existingItemIndex > -1) {
      updatedItems = [...invoiceData.products];
      updatedItems[existingItemIndex].quantity += quantityNum;
      toast.info(
        `Кількість товару "${productDetails.name} (${sizeToAdd})" оновлено.`
      );
    } else {
      const newItem = {
        product: productToAdd.value,
        name: productDetails.name,
        size: sizeToAdd,
        quantity: quantityNum,
        pricePerUnit: pricePerUnitToAdd, // Використовуємо розраховану/введену ціну
      };
      updatedItems = [...invoiceData.products, newItem];
      toast.success(`Товар "${newItem.name} (${newItem.size})" додано.`);
    }

    setInvoiceData((prev) => ({ ...prev, products: updatedItems }));
    recalculateTotalAmount(updatedItems);

    setProductToAdd(null);
    setSizeToAdd("");
    setQuantityToAdd(1);
    setPricePerUnitToAdd(0);
  };

  // --- Видалення товару ---
  const handleRemoveProductFromList = (indexToRemove) => {
    const updatedItems = invoiceData.products.filter(
      (_, index) => index !== indexToRemove
    );
    setInvoiceData((prev) => ({ ...prev, products: updatedItems }));
    recalculateTotalAmount(updatedItems);
  };

  // --- Зміна кількості В СПИСКУ ---
  const handleQuantityChangeInList = (index, newQuantityStr) => {
    const updatedItems = [...invoiceData.products];
    const item = updatedItems[index];
    if (!item) return; // Перевірка чи існує елемент

    let newQuantity = parseInt(newQuantityStr, 10);

    // Якщо поле порожнє або не число, або <= 0, ставимо 1
    if (isNaN(newQuantity) || newQuantity <= 0) {
      newQuantity = 1;
    }

    updatedItems[index] = { ...item, quantity: newQuantity };
    setInvoiceData((prev) => ({ ...prev, products: updatedItems }));
    recalculateTotalAmount(updatedItems); // Перераховуємо суму одразу
  };

  // Обробник blur для поля кількості в списку (для фіксації значення 1)
  const handleQuantityBlurInList = (index, currentQuantityStr) => {
    const currentQuantity = parseInt(currentQuantityStr, 10);
    if (isNaN(currentQuantity) || currentQuantity <= 0) {
      handleQuantityChangeInList(index, "1"); // Встановлюємо 1, якщо некоректне значення
    }
  };

  // --- Збереження ---
  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const dataToSend = {
        id: invoiceData._id,
        products: invoiceData.products.map((item) => ({
          product: item.product,
          size: item.size,
          quantity: Number(item.quantity), // Переконуємось що це число
          pricePerUnit: Number(item.pricePerUnit), // і це
        })),
        totalAmount: invoiceData.totalAmount,
        notes: invoiceData.notes,
        status: invoiceData.status,
      };

      const response = await axios.post(
        `${url}/api/invoices/edit-invoice`,
        dataToSend
      );

      if (response.data.success) {
        toast.success(response.data.message || "Накладну успішно оновлено!");
        navigate("/admin_panel/list-invoice");
      } else {
        toast.error(response.data.message || "Не вдалося оновити накладну");
      }
    } catch (error) {
      console.error("Помилка оновлення:", error);
      toast.error(error.response?.data?.message || "Сталася невідома помилка");
    } finally {
      setIsSaving(false);
    }
  };

  const supplierName =
    suppliers.find((s) => s._id === invoiceData.supplier)?.companyName ||
    "Невідомий постачальник";

  return (
    <section className="p-10 w-full bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
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
            Редагування прибуткової накладної №{" "}
            {invoiceData.invoiceNumber || "..."}
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
                    Редагування прибуткової накладної № {invoiceData.invoiceNumber || "..."}
                </h4> */}

        <form onSubmit={onSubmitHandler} className="space-y-6">
          {/* --- Основна інформація --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-y-1">
              <label className="text-base font-medium text-gray-900">
                Постачальник
              </label>
              <div className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] bg-gray-100 text-gray-900 flex items-center">
                {supplierName}
              </div>
            </div>
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="status"
                className="text-base font-medium text-gray-900"
              >
                Статус <span className="text-[#99120d]">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={invoiceData.status}
                onChange={handleInvoiceDataChange}
                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
              >
                <option value="активна">Активна</option>
                <option value="скасована">Скасована</option>
                <option value="виконана">Виконана</option>
              </select>
            </div>
          </div>

          {/* --- Додавання товару --- */}
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-base font-medium px-2 text-gray-900">
              Додати товар
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {/* Товар */}
              <div className="flex flex-col gap-y-1 lg:col-span-2">
                <label
                  htmlFor="product-select"
                  className="text-sm font-medium text-gray-600"
                >
                  Товар
                </label>
                <Select
                  inputId="product-select"
                  options={filteredProductsOptions}
                  value={productToAdd}
                  onChange={handleProductToAddChange}
                  placeholder="Пошук товару..."
                  isClearable
                  noOptionsMessage={() => "Немає доступних товарів"}
                  styles={{
                    control: (base) => ({ ...base, minHeight: "38px" }),
                    menu: (base) => ({ ...base, zIndex: 5 }),
                  }}
                  theme={(theme) => ({
                    ...theme,
                    borderRadius: 6,
                    colors: {
                      ...theme.colors,
                      primary25: "#e0f2fe",
                      primary: "#3b82f6",
                    },
                  })}
                />
              </div>
              {/* Розмір */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="size-add-select"
                  className="text-sm font-medium text-gray-600"
                >
                  Розмір
                </label>
                <select
                  id="size-add-select"
                  value={sizeToAdd}
                  onChange={handleSizeToAddChange}
                  className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm"
                  disabled={
                    !productToAdd ||
                    availableSizesForSelectedProduct.length === 0
                  }
                >
                  <option value="" disabled>
                    -- Розмір --
                  </option>
                  {availableSizesForSelectedProduct.map((sizeInfo) => (
                    <option key={sizeInfo.size} value={sizeInfo.size}>
                      {sizeInfo.size}
                    </option>
                  ))}
                </select>
              </div>
              {/* Кількість */}
              <div className="flex flex-col gap-y-1">
                <label
                  htmlFor="quantity-add-input"
                  className="text-sm font-medium text-gray-600"
                >
                  Кількість
                </label>
                <input
                  id="quantity-add-input"
                  type="number"
                  value={quantityToAdd}
                  onChange={handleQuantityToAddChange}
                  onBlur={handleQuantityToAddBlur}
                  min="1"
                  placeholder="1"
                  className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out text-sm w-full"
                  disabled={!sizeToAdd}
                />
              </div>
              {/* Кнопка Додати */}
              <div className="self-end pb-1">
                <button
                  type="button"
                  onClick={handleAddProductToList}
                  className="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2 bg-[#0a6e13] text-white font-medium rounded-lg shadow-sm hover:bg-[#08580f] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0a6e13] transition text-sm h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!sizeToAdd || !productToAdd}
                >
                  <FaPlus /> Додати
                </button>
              </div>
              {/* Ціна/од. */}
              <div className="flex flex-col gap-y-1 lg:col-start-4">
                <label className="text-sm font-medium text-gray-600">
                  Розрахована Ціна/од.
                </label>
                <div className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] bg-gray-100 text-gray-900 flex items-center justify-end">
                  {pricePerUnitToAdd.toFixed(2)} грн
                </div>
              </div>
            </div>
          </fieldset>

          {/* --- Список доданих товарів (з редагуванням кількості) --- */}
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-base font-medium px-2 text-gray-900">
              Товари в накладній
            </legend>
            {invoiceData.products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  {" "}
                  {/* Збільшив min-w */}
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border text-center font-semibold text-gray-900">
                        Назва товару
                      </th>
                      <th className="p-2 border text-center font-semibold text-gray-900 w-20">
                        Розмір
                      </th>
                      {/* Змінив заголовок К-ть */}
                      <th className="p-2 border text-center font-semibold text-gray-900 w-32">
                        Кількість
                      </th>
                      <th className="p-2 border text-center font-semibold text-gray-900 w-28">
                        Ціна/од.
                      </th>
                      <th className="p-2 border text-center font-semibold text-gray-900 w-32">
                        Сума
                      </th>
                      <th className="p-2 border text-center font-semibold text-gray-900 w-20">
                        Дія
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.products.map((item, index) => (
                      <tr key={`${item.product}-${item.size}-${index}`}>
                        <td className="p-2 border align-middle">
                          {item.name || "Невідомий товар"}
                        </td>
                        <td className="p-2 border text-center align-middle">
                          {item.size}
                        </td>
                        {/* --- Редагована Кількість --- */}
                        <td className="p-1 border text-center align-middle">
                          {" "}
                          {/* Зменшив p-1 */}
                          <div className="flex items-center justify-center gap-1">
                            {/* Кнопка мінус */}
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChangeInList(
                                  index,
                                  String(item.quantity - 1)
                                )
                              }
                              disabled={item.quantity <= 1} // Вимкнути, якщо кількість 1
                              className="p-1 text-gray-500 hover:text-[#99120d] disabled:opacity-30"
                              title="Зменшити кількість"
                            >
                              <FaMinus size={12} />
                            </button>
                            {/* Поле вводу */}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChangeInList(
                                  index,
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                handleQuantityBlurInList(index, e.target.value)
                              } // Додав onBlur
                              min="1"
                              className="border border-gray-300 rounded text-center outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[30px] w-12 text-sm transition duration-150 ease-in-out"
                              aria-label={`Кількість для ${item.name}`}
                            />
                            {/* Кнопка плюс */}
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChangeInList(
                                  index,
                                  String(item.quantity + 1)
                                )
                              }
                              className="p-1 text-gray-500 hover:text-[#0a6e13]"
                              title="Збільшити кількість"
                            >
                              <FaPlusCircle size={14} />
                            </button>
                          </div>
                        </td>
                        {/* --- Кінець редагованої кількості --- */}
                        <td className="p-2 border text-right align-middle">
                          {item.pricePerUnit.toFixed(2)} грн
                        </td>
                        <td className="p-2 border text-right align-middle font-medium">
                          {(item.quantity * item.pricePerUnit).toFixed(2)} грн
                        </td>
                        <td className="p-2 border text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromList(index)}
                            className="p-1 text-[#99120d] hover:text-[#7a0e0a]"
                            title="Видалити товар"
                          >
                            <FaTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td
                        colSpan="4"
                        className="p-2 border text-right font-semibold text-gray-900"
                      >
                        Загальна сума:
                      </td>
                      <td className="p-2 border text-right font-bold text-lg text-gray-800">
                        {invoiceData.totalAmount.toFixed(2)} грн
                      </td>
                      <td className="p-2 border"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic p-4 text-center">
                Додайте товари до накладної.
              </p>
            )}
          </fieldset>

          {/* --- Нотатки --- */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
            >
              <FaArrowLeft /> Скасувати
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
              disabled={isSaving}
            >
              <FaSave /> {isSaving ? "Збереження..." : "Зберегти зміни"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EditInvoice;

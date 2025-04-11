import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus, FaArrowLeft } from 'react-icons/fa6';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';

// Визначаємо компонент
const AddInvoice = () => {
    const url = "http://localhost:4000";
    const navigate = useNavigate();
    const [data, setData] = useState({
        supplier: "",
        totalAmount: 0,
        notes: "",
    });

    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);

    // Стани для секції форми "Додати один товар"
    const [selectedProductOption, setSelectedProductOption] = useState(null); // Об'єкт { value: 'id', label: '...' } з react-select
    const [selectedSize, setSelectedSize] = useState("");                   // Вибраний розмір для одного додавання
    const [selectedQuantity, setSelectedQuantity] = useState("");             // Кількість для одного додавання
    const [pricePerUnit, setPricePerUnit] = useState(0);                  // Розрахована ціна для вибраного товару

    // Стан для секції форми "Додати всі розміри"
    const [quantityForAllSizes, setQuantityForAllSizes] = useState("");     // Кількість, яка застосовується до всіх розмірів

    // --- Отримання даних ---
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await axios.get(`${url}/api/suppliers/list-supplier`);
                if (response.data.success) {
                    setSuppliers(response.data.data);
                } else {
                    toast.error("Помилка завантаження списку постачальників");
                    console.error("Supplier fetch error:", response.data.message);
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані постачальників");
                console.error("Supplier fetch exception:", error);
            }
        };

        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${url}/api/product/list-product`);
                if (response.data.success) {
                    setProducts(response.data.data);
                } else {
                    toast.error("Помилка завантаження списку товарів");
                    console.error("Product fetch error:", response.data.message);
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані товарів");
                console.error("Product fetch exception:", error);
            }
        };

        fetchSuppliers();
        fetchProducts();
    }, [url]); // Масив залежностей включає url

    // --- Мемоізовані обчислення ---

    // Фільтруємо товари на основі типу вибраного постачальника
    const filteredProducts = useMemo(() => {
        if (!data.supplier) return [];
        const supplier = suppliers.find((s) => s._id === data.supplier);
        if (!supplier) return [];

        let allowedCategories = [];
        if (supplier.productType === "одяг") {
            allowedCategories = ["Для чоловіків", "Для жінок"];
        } else if (supplier.productType === "аксесуари") {
            allowedCategories = ["Аксесуари"];
        } else {
            allowedCategories = ["Інше"]; // Налаштуйте за потреби
        }
        // Переконуємося, що product.category існує перед перевіркою includes
        return products.filter((product) => product.category && allowedCategories.includes(product.category));
    }, [data.supplier, suppliers, products]);

    // Форматуємо відфільтровані товари для react-select
    const productOptions = useMemo(() => {
        return filteredProducts.map(product => ({
            value: product._id,
            label: `${product.name} (ID: ${product._id})` // Показуємо назву та ID
        }));
    }, [filteredProducts]);

    // Отримуємо доступні розміри для поточного вибраного товару
    const getAvailableSizes = () => {
        if (!selectedProductOption || !selectedProductOption.value) {
            return [];
        }
        const productId = selectedProductOption.value;
        const product = products.find((p) => p._id === productId);
        // Повертаємо масив розмірів, якщо він існує та є масивом, інакше порожній масив
        return product && Array.isArray(product.sizes) ? product.sizes : [];
    };

    // --- Обробники подій ---

    // Обробляємо зміну у виборі постачальника
    const handleSupplierChange = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
        // Скидаємо вибори, пов'язані з товаром, при зміні постачальника
        resetProductSelectionFields();
    };

    // Обробляємо зміну у виборі товару (react-select)
    const handleProductSelectChange = (selectedOption) => {
        setSelectedProductOption(selectedOption);
        // Скидаємо розмір, кількості та розраховуємо ціну
        setSelectedSize("");
        setSelectedQuantity("");
        setQuantityForAllSizes(""); // Скидаємо також кількість для всіх розмірів

        if (selectedOption && selectedOption.value) {
            const product = products.find((p) => p._id === selectedOption.value);
            if (product && typeof product.price === 'number') {
                // Ваша логіка для розрахунку закупівельної ціни (наприклад, 25% від роздрібної)
                const calculatedPrice = product.price * 0.25;
                setPricePerUnit(calculatedPrice);
            } else {
                setPricePerUnit(0); // Скидаємо ціну, якщо товар/ціна недійсні
            }
        } else {
            setPricePerUnit(0); // Скидаємо ціну, якщо товар не вибрано
        }
    };

    // Обробляємо зміни у простих полях введення форми (наприклад, нотатки)
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // --- Функції для зміни списку товарів накладної ---

    // Додаємо один розмір товару до списку
    const addProductToList = () => {
        // Перевіряємо введені дані
        if (!selectedProductOption) { toast.error("Будь ласка, оберіть товар"); return; }
        if (!selectedSize) { toast.error("Будь ласка, оберіть розмір"); return; }
        const quantity = parseInt(selectedQuantity);
        if (isNaN(quantity) || quantity <= 0) { toast.error("Кількість товару має бути позитивним числом"); return; }
        if (pricePerUnit <= 0) { toast.warn("Ціна за одиницю 0 або не розрахована. Товар буде додано з ціною 0."); }

        const productId = selectedProductOption.value;
        const productExists = products.find(p => p._id === productId);
        if (!productExists) { toast.error("Обраний товар не знайдено в системі."); return; }

        // Створюємо новий запис товару
        const newProduct = {
            product: productId,
            size: selectedSize,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
        };

        // Оновлюємо список та перераховуємо загальну суму
        const updatedSelectedProducts = [...selectedProducts, newProduct];
        updateInvoiceProducts(updatedSelectedProducts);

        // Скидаємо поля введення для наступного додавання
        resetProductSelectionFields();
    };

    // Додаємо всі доступні розміри вибраного товару до списку
    const addAllSizesToList = () => {
        // Перевіряємо введені дані
        if (!selectedProductOption || !selectedProductOption.value) { toast.error("Будь ласка, спочатку оберіть товар"); return; }
        const quantityNum = parseInt(quantityForAllSizes);
        if (isNaN(quantityNum) || quantityNum <= 0) { toast.error("Будь ласка, введіть коректну кількість (> 0) для всіх розмірів"); return; }
        if (pricePerUnit <= 0) { toast.warn("Ціна за одиницю 0 або не розрахована. Товари будуть додані з ціною 0."); }

        const productId = selectedProductOption.value;
        const allSizes = getAvailableSizes(); // Отримуємо масив об'єктів розмірів { size: 'S', quantity: 10 }

        if (allSizes.length === 0) { toast.info("У вибраного товару немає визначених розмірів."); return; }

        // Створюємо масив нових записів товарів, по одному для кожного розміру
        const newProductsToAdd = allSizes.map(sizeInfo => ({
            product: productId,
            size: sizeInfo.size, // Беремо рядок розміру ('S', 'M', тощо)
            quantity: quantityNum, // Використовуємо кількість, вказану для всіх розмірів
            pricePerUnit: pricePerUnit,
        }));

        // Оновлюємо список та перераховуємо загальну суму
        const updatedSelectedProducts = [...selectedProducts, ...newProductsToAdd];
        updateInvoiceProducts(updatedSelectedProducts);

        toast.success(`Додано ${allSizes.length} розмір(и) товару "${selectedProductOption.label.split(' (ID:')[0]}"`);

        // Скидаємо поля введення для наступного додавання
        resetProductSelectionFields();
    };

    // Видаляємо товар зі списку за його індексом
    const removeProductFromList = (indexToRemove) => {
        const updatedSelectedProducts = selectedProducts.filter((_, index) => index !== indexToRemove);
        // Оновлюємо список та перераховуємо загальну суму
        updateInvoiceProducts(updatedSelectedProducts);
    };

    // Допоміжна функція для оновлення вибраних товарів та перерахунку загальної суми
    const updateInvoiceProducts = (updatedList) => {
        setSelectedProducts(updatedList);
        const newTotalAmount = updatedList.reduce((sum, item) => {
            // Переконуємося, що кількість та ціна є числами перед множенням
            const itemQuantity = Number(item.quantity) || 0;
            const itemPrice = Number(item.pricePerUnit) || 0;
            return sum + (itemQuantity * itemPrice);
        }, 0);
        setData(prevData => ({ ...prevData, totalAmount: newTotalAmount }));
    };


    // Допоміжна функція для скидання полів вибору товару
    const resetProductSelectionFields = () => {
        setSelectedProductOption(null);
        setSelectedSize("");
        setSelectedQuantity("");
        setQuantityForAllSizes("");
        setPricePerUnit(0);
    };

    // --- Відправка форми ---
    const onSubmitHandler = async (event) => {
        event.preventDefault(); // Запобігаємо стандартній відправці форми

        // Готуємо дані для API
        const invoiceData = {
            supplier: data.supplier,
            notes: data.notes,
            totalAmount: data.totalAmount, // Використовуємо розраховану загальну суму
            products: selectedProducts,    // Надсилаємо список доданих товарів
        };

        console.log("Відправка даних накладної:", invoiceData);

        try {
            // Робимо POST-запит
            const response = await axios.post(`${url}/api/invoices/add-invoice`, invoiceData);
            console.log("Відповідь сервера:", response.data);

            if (response.data.success) {
                toast.success(response.data.message || "Накладну успішно додано!");
                // Скидаємо всю форму при успіху
                setData({
                    supplier: "",
                    totalAmount: 0,
                    notes: "",
                });
                setSelectedProducts([]);
                resetProductSelectionFields(); // Скидаємо також поля введення товару
            } else {
                // Показуємо конкретне повідомлення про помилку з бекенду, якщо воно є
                toast.error(response.data.message || "Помилка при додаванні накладної");
            }
        } catch (error) {
            console.error("Помилка відправки накладної:", error);
            // Намагаємося показати повідомлення про помилку з відповіді або загальне повідомлення
            const errorMessage = error.response?.data?.message || error.message || "Не вдалося додати накладну (невідома помилка)";
            toast.error(errorMessage);
        }
    };

    // --- JSX Рендеринг ---
    return (
        <section className="p-10 w-full bg-gray-100 min-h-screen flex justify-center"> {/* Налаштовано відступи та фон */}
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-6 max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md"> {/* Додано контейнер */}
                <h4 className="text-xl font-semibold pb-2 uppercase border-b border-gray-300 text-gray-800">Додавання прибуткової накладної</h4>

                {/* Вибір постачальника */}
                <div className="flex flex-col gap-y-2">
                    <label htmlFor="supplier-select" className='text-base font-medium text-gray-700'>Постачальник </label>
                    <select
                        id="supplier-select"
                        onChange={handleSupplierChange}
                        value={data.supplier}
                        name="supplier" // Важливо для handleSupplierChange
                        className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out" // Покращені стилі
                    >
                        <option value="" disabled>-- Оберіть постачальника --</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier._id} value={supplier._id}>
                                {supplier.companyName} ({supplier.productType}) {/* Показуємо тип для ясності */}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Блок додавання товарів */}
                <fieldset className="border border-gray-300 p-4 rounded-md">
                    <legend className="text-base font-medium px-2 text-gray-700">Додати товар</legend>
                    {/* Ряд 1: Вибір товару */}
                    <div className="mb-4">
                        <label htmlFor="product-select" className='block text-sm font-medium text-gray-600 mb-1'>Товар</label>
                        <Select
                            inputId="product-select" // Для зв'язку з label
                            options={productOptions}
                            value={selectedProductOption}
                            onChange={handleProductSelectChange}
                            placeholder="Пошук за назвою або ID..."
                            isClearable // Дозволяє очистити вибір
                            isDisabled={!data.supplier} // Блокуємо, якщо постачальника не вибрано
                            noOptionsMessage={() => filteredProducts.length === 0 && data.supplier ? "Немає доступних товарів для цього постачальника" : "Спочатку оберіть постачальника"}
                            styles={{
                                control: (base, state) => ({ ...base, minHeight: '38px', borderColor: state.isFocused ? '#3b82f6' : 'rgb(209 213 219)', '&:hover': { borderColor: '#9ca3af' }, boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none', borderRadius: '0.375rem' }),
                                input: (base) => ({ ...base, margin: '0px', padding: '0px' }),
                                valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                indicatorsContainer: (base) => ({ ...base, padding: '1px' }),
                                placeholder: (base) => ({ ...base, color: '#6b7280' }), // Сірий-500 для плейсхолдера
                                menu: (base) => ({ ...base, zIndex: 20 }) // Переконуємося, що випадаючий список зверху
                            }}
                            theme={(theme) => ({ // Опціонально: Налаштування кольорів теми
                                ...theme,
                                borderRadius: 6,
                                colors: {
                                    ...theme.colors,
                                    primary25: '#e0f2fe', // Світло-блакитний при наведенні
                                    primary: '#3b82f6', // Блакитний при виборі
                                },
                            })}
                        />
                    </div>

                    {/* Ряд 2: Розмір, Кількість, Ціна, Кнопки додавання */}
                    <div className="flex flex-wrap gap-x-4 gap-y-3 items-end"> {/* Додано gap-y */}
                        {/* Вибір розміру */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="size-select" className='text-sm font-medium text-gray-600'>Розмір</label>
                            <select
                                id="size-select"
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] w-28 transition duration-150 ease-in-out"
                                onChange={(e) => setSelectedSize(e.target.value)}
                                value={selectedSize}
                                disabled={!selectedProductOption} // Блокуємо, якщо товар не вибрано
                            >
                                <option value="" disabled>-- Розмір --</option>
                                {getAvailableSizes().map((sizeInfo, index) => (
                                    // Тепер sizeInfo - це об'єкт { size: '...', quantity: ... }
                                    <option key={index} value={sizeInfo.size}>
                                        {sizeInfo.size}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Кількість (Один розмір) */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="quantity-input" className='text-sm font-medium text-gray-600'>Кількість</label>
                            <input
                                id="quantity-input"
                                type="number"
                                placeholder="0"
                                min="1" // Мінімальна кількість - 1
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 w-20 h-[38px] transition duration-150 ease-in-out"
                                value={selectedQuantity}
                                onChange={(e) => setSelectedQuantity(e.target.value)}
                                disabled={!selectedProductOption || !selectedSize} // Блокуємо, якщо товар/розмір не вибрано
                            />
                        </div>

                        {/* Ціна за одиницю */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="price-input" className='text-sm font-medium text-gray-600'>Ціна/од.</label>
                            <input
                                id="price-input"
                                type="number"
                                // Показуємо порожнє поле, якщо ціна 0 або не встановлена
                                value={pricePerUnit > 0 ? pricePerUnit.toFixed(2) : ''}
                                readOnly // Ціна розраховується автоматично
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none bg-gray-100 w-28 h-[38px] cursor-not-allowed"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Кнопка "Додати" (один розмір) */}
                        <button
                            type="button"
                            title="Додати вибраний товар до накладної"
                            className="px-4 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#fbb42c] transition h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={addProductToList}
                        // Кнопка неактивна, якщо не вибрано товар, розмір, або кількість не є позитивним числом
                        //disabled={!selectedProductOption || !selectedSize || !selectedQuantity || parseInt(selectedQuantity) <= 0}
                        >
                            Додати
                        </button>

                        {/* Роздільник та секція "Додати всі" */}
                        <div className="flex items-end gap-2 border-l border-gray-300 pl-4 ml-auto"> {/* Використовуємо ml-auto для притискання вправо */}
                            {/* Кількість для всіх */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="quantity-all-input" className='text-sm font-medium text-gray-600'>К-ть для всіх</label>
                                <input
                                    id="quantity-all-input"
                                    type="number"
                                    placeholder="0"
                                    min="1"
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 w-20 h-[38px] transition duration-150 ease-in-out"
                                    value={quantityForAllSizes}
                                    onChange={(e) => setQuantityForAllSizes(e.target.value)}
                                    // Блокуємо, якщо товар не вибрано або у нього немає розмірів
                                    disabled={!selectedProductOption || getAvailableSizes().length === 0}
                                />
                            </div>
                            {/* Кнопка "Додати всі розміри" */}
                            <button
                                type="button"
                                title="Додати всі доступні розміри цього товару"
                                className="px-3 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition h-[38px] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                onClick={addAllSizesToList}
                                // Блокуємо, якщо товар не вибрано, кількість не введено (>0), або немає розмірів
                                disabled={!selectedProductOption || !quantityForAllSizes || parseInt(quantityForAllSizes) <= 0 || getAvailableSizes().length === 0}
                            >
                                Додати всі
                            </button>
                        </div>
                    </div>
                </fieldset>

                {/* Список вибраних товарів */}
                {selectedProducts.length > 0 && ( // Показуємо блок, тільки якщо є товари
                    <div className="flex flex-col gap-y-2 mt-4">
                        <p className='text-base font-medium text-gray-700'>Товари в накладній:</p>
                        <div className='border border-gray-300 rounded-md max-h-60 overflow-y-auto'> {/* Додано обгортку для тіні/скролу */}
                            <ul className='divide-y divide-gray-200'>
                                {selectedProducts.map((item, index) => {
                                    // Знаходимо повну інформацію про товар для відображення назви
                                    const product = products.find((p) => p._id === item.product);
                                    const displayPrice = Number(item.pricePerUnit) || 0; // Переконуємося, що ціна - число
                                    return (
                                        // Використовуємо унікальний ключ, що включає індекс
                                        <li key={`${item.product}-${item.size}-${index}`} className="flex justify-between items-center p-2 text-sm">
                                            <span className='flex-1 mr-2'>
                                                <span className='font-medium text-gray-800'>{product?.name || `Товар ID: ${item.product}`}</span>
                                                <span className='text-gray-600'> (Розмір: {item.size}, К-ть: {item.quantity}, Ціна: {displayPrice.toFixed(2)} грн)</span>
                                            </span>
                                            <button
                                                type="button"
                                                title="Видалити товар зі списку"
                                                className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition duration-150 ease-in-out"
                                                onClick={() => removeProductFromList(index)} // Викликаємо оновлену функцію
                                            >
                                                Видалити
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Загальна сума */}
                <div className="flex flex-col gap-y-2">
                    <label htmlFor="totalAmount-input" className='text-base font-medium text-gray-700'>Загальна сума</label>
                    <input
                        id="totalAmount-input"
                        type="number"
                        value={data.totalAmount.toFixed(2)}
                        readOnly // Розраховується автоматично
                        className="border border-gray-300 rounded-md py-1.5 px-3 outline-none bg-gray-100 h-[38px] cursor-not-allowed"
                    />
                </div>

                {/* Нотатки */}
                <div className="flex flex-col gap-y-2">
                    <label htmlFor="notes-textarea" className='text-base font-medium text-gray-700'>Нотатки</label>
                    <textarea
                        id="notes-textarea"
                        onChange={onChangeHandler} // Потрібен для оновлення стану data.notes
                        value={data.notes}
                        name="notes" // Важливо для onChangeHandler
                        placeholder='Додаткова інформація по накладній...'
                        rows={3} // Зменшено рядки за замовчуванням
                        className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px] transition duration-150 ease-in-out" // Дозволяємо змінювати висоту
                    ></textarea>
                </div>

                {/* Кнопка додавання накладної */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
                    <button
                        type="button"
                        onClick={() => navigate(-1)} // Кнопка Назад/Скасувати
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
                    >
                        <FaArrowLeft /> Скасувати
                    </button>
                    <button
                        type='submit'
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                    // Неактивна, якщо немає товарів або не вибрано постачальника
                    //disabled={selectedProducts.length === 0 || !data.supplier}
                    >
                        <FaPlus />
                        Додати накладну
                    </button>
                </div>
            </form>
        </section>
    );
};

export default AddInvoice;
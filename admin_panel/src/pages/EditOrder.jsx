import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Додав useCallback
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlus, FaTrash, FaUndo, FaExclamationTriangle, FaArrowLeft, FaMinus, FaPlusCircle, FaSpinner } from 'react-icons/fa';

const EditOrder = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editReason, setEditReason] = useState("");
    const [products, setProducts] = useState([]);
    const [availableQuantities, setAvailableQuantities] = useState({});
    const [itemQuantityErrors, setItemQuantityErrors] = useState({}); // Стан для помилок кількості в таблиці

    // Стани для секції "Додати товар"
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [addStockError, setAddStockError] = useState("");

    // Список причин редагування
    const editReasons = [
        "Відсутність товару на складі",
        "Дефект або пошкодження товару",
        "Зміна доступних розмірів",
        "Запит покупця",
        "Виправлення помилки оператора",
        "Технічні збої в системі",
        "Інша причина" // Можливо, додати поле для коментаря, якщо обрано "Інша"
    ];

    // --- Допоміжні функції ---
    const calculateDiscountedPrice = (price = 0, discount = 0) => {
        return discount > 0 ? price * (100 - discount) / 100 : price;
    };

    // Розрахунок суми (винесено в useCallback)
    const calculateTotal = useCallback((items = []) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                const itemPrice = calculateDiscountedPrice(item.price, item.discount);
                return total + (itemPrice * (Number(item.quantity) || 0)); // Переконуємось, що quantity - число
            }, 0);
    }, []); // Немає залежностей, бо використовує лише аргумент items

    const getAvailableQuantity = useCallback((productId, size) => {
        if (!productId || !size) return 0;
        const key = `${productId}-${size}`;
        return availableQuantities[key] === undefined ? 0 : availableQuantities[key];
    }, [availableQuantities]); // Залежить від availableQuantities

    const getSelectedAvailableQuantity = useCallback(() => {
        return getAvailableQuantity(selectedProduct, selectedSize);
    }, [selectedProduct, selectedSize, getAvailableQuantity]);

    // --- Завантаження даних ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Запит замовлення
                const orderResponse = await axios.get(`${url}/api/order/edit-order/${id}`);
                if (orderResponse.data.success && orderResponse.data.data) {
                    const fetchedOrder = orderResponse.data.data;
                    // Перетворення quantity на числа та встановлення removed: false за замовчуванням
                    fetchedOrder.items = fetchedOrder.items.map(item => ({
                        ...item,
                        quantity: parseInt(item.quantity, 10) || 1,
                        removed: item.removed || false, // Гарантуємо наявність поля
                        discountedPrice: calculateDiscountedPrice(item.price, item.discount) // Одразу рахуємо ціну зі знижкою
                    }));
                    setOrder(fetchedOrder);
                } else {
                    toast.error(orderResponse.data.message || "Помилка завантаження замовлення");
                    setOrder(null); // Важливо скинути, якщо помилка
                }

                // Запит списку товарів (для додавання та перевірки залишків)
                const productsResponse = await axios.get(`${url}/api/product/list-product`);
                if (productsResponse.data.success) {
                    setProducts(productsResponse.data.data);
                    // Створюємо мапу залишків
                    const quantitiesMap = {};
                    productsResponse.data.data.forEach(product => {
                        product.sizes?.forEach(size => { // Додав ?. для безпеки
                            quantitiesMap[`${product._id}-${size.size}`] = parseInt(size.quantity, 10) || 0;
                        });
                    });
                    setAvailableQuantities(quantitiesMap);
                } else {
                    toast.warn("Не вдалося завантажити список товарів для додавання.");
                }

            } catch (error) {
                toast.error("Не вдалося отримати дані для редагування");
                console.error("Fetch data error:", error);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        } else {
            toast.error("ID замовлення не вказано.");
            navigate('/admin_panel/orders'); // Використовуємо новий шлях
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, url]); // Не додаємо navigate

    // --- Обробники змін для секції "Додати товар" ---
    const handleSelectedProductChange = (e) => {
        setSelectedProduct(e.target.value);
        setSelectedSize(""); // Скидаємо розмір
        setSelectedQuantity(1); // Скидаємо кількість
        setAddStockError(""); // Скидаємо помилку
    };

    const handleSelectedSizeChange = (e) => {
        const newSize = e.target.value;
        setSelectedSize(newSize);
        setSelectedQuantity(1); // Скидаємо кількість при зміні розміру
        // Перевіряємо сток для 1 шт нового розміру
        const maxQty = getAvailableQuantity(selectedProduct, newSize);
        if (1 > maxQty) {
            setAddStockError(`На складі доступно лише ${maxQty} шт.`);
        } else {
            setAddStockError("");
        }
    };

    const handleSelectedQuantityChange = (e) => {
        const inputValue = e.target.value;
        // Дозволяємо порожній рядок тимчасово
        if (inputValue === '') {
            setSelectedQuantity(''); // Ставимо порожній рядок
            setAddStockError(''); // Скидаємо помилку
            return;
        }
        const numericValue = parseInt(inputValue, 10);
        if (!isNaN(numericValue) && numericValue >= 1) { // Дозволяємо 1 і більше
            setSelectedQuantity(numericValue); // Встановлюємо число
            // Перевіряємо сток для введеного значення
            const maxQty = getSelectedAvailableQuantity();
            if (numericValue > maxQty) {
                setAddStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setAddStockError("");
            }
        } else if (!isNaN(numericValue) && numericValue <= 0) {
            // Якщо ввели 0 або менше, ігноруємо або ставимо 1 при blur
            setSelectedQuantity(''); // Можна очистити, щоб при blur стало 1
        }
        // Якщо ввели не число, стан не зміниться
    };

    const handleSelectedQuantityBlur = () => {
        const currentQuantity = parseInt(selectedQuantity, 10);
        // Якщо після blur поле порожнє, не число, або <= 0, ставимо 1
        if (isNaN(currentQuantity) || currentQuantity <= 0) {
            setSelectedQuantity(1);
            // Перевіряємо сток для 1
            const maxQty = getSelectedAvailableQuantity();
            if (1 > maxQty) {
                setAddStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setAddStockError("");
            }
        } else {
            // Якщо число валідне, ще раз перевіряємо сток (на випадок зміни даних)
            const maxQty = getSelectedAvailableQuantity();
            if (currentQuantity > maxQty) {
                setAddStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setAddStockError("");
            }
        }
    };

    // --- Додавання товару до замовлення ---
    const addProduct = () => {
        if (!selectedProduct || !selectedSize) { /* ... валідація ... */ return; }
        const quantityToAdd = parseInt(selectedQuantity, 10);
        if (isNaN(quantityToAdd) || quantityToAdd <= 0) { /* ... валідація ... */ return; }

        const availableQty = getSelectedAvailableQuantity();
        if (quantityToAdd > availableQty) { /* ... перевірка стоку ... */ return; }
        setAddStockError("");

        const existingItemIndex = order.items.findIndex(item =>
            !item.removed && item.productId === selectedProduct && item.size === selectedSize
        );
        const productDetails = products.find(p => p._id === selectedProduct);
        if (!productDetails) { /* ... перевірка ... */ return; }

        let updatedItems;
        if (existingItemIndex > -1) {
            updatedItems = [...order.items];
            const newQuantity = updatedItems[existingItemIndex].quantity + quantityToAdd;
            const itemAvailable = getAvailableQuantity(selectedProduct, selectedSize);
            if (newQuantity > itemAvailable) {
                toast.error(`Загальна кількість (${newQuantity}) перевищує залишок (${itemAvailable}).`);
                setItemQuantityErrors(prev => ({ ...prev, [`${selectedProduct}-${selectedSize}`]: `На складі: ${itemAvailable}` }));
                return; // Не оновлюємо
            } else {
                // Видаляємо помилку, якщо вона була для цього товару
                setItemQuantityErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`${selectedProduct}-${selectedSize}`];
                    return newErrors;
                });
            }
            updatedItems[existingItemIndex].quantity = newQuantity;
            toast.success(`Кількість "${productDetails.name} (${selectedSize})" оновлено.`);
        } else {
            const newItem = { /* ... створення нового товару ... */ };
            updatedItems = [...order.items, newItem];
            // Перевіряємо сток для нового товару (хоча вже перевіряли)
            if (newItem.quantity > availableQty) {
                setItemQuantityErrors(prev => ({ ...prev, [`${newItem.productId}-${newItem.size}`]: `На складі: ${availableQty}` }));
            }
            toast.success(`Товар "${newItem.name} (${newItem.size})" додано.`);
        }

        setOrder(prev => ({ ...prev, items: updatedItems, amount: calculateTotal(updatedItems) }));
        // Скидання полів додавання
        setSelectedSize("");
        setSelectedQuantity(1);
        setAddStockError("");
        // Можна не скидати selectedProduct для зручності додавання різних розмірів
    };


    // --- Видалення/Відновлення товару ---
    const removeProduct = (index) => {
        const updatedItems = [...order.items];
        if (updatedItems[index]) {
            updatedItems[index].removed = true;
            setOrder(prev => ({
                ...prev,
                items: updatedItems,
                amount: calculateTotal(updatedItems) // Сума перераховується
            }));
        }
    };

    const restoreProduct = (index) => {
        const updatedItems = [...order.items];
        const itemToRestore = updatedItems[index];

        if (!itemToRestore) return;

        // Перевірка залишків перед відновленням
        const availableQty = getAvailableQuantity(itemToRestore.productId, itemToRestore.size);
        if (itemToRestore.quantity > availableQty) {
            toast.error(`Неможливо відновити "${itemToRestore.name}" (${itemToRestore.size}). На складі лише ${availableQty} шт.`);
            return;
        }

        updatedItems[index].removed = false;
        setOrder(prev => ({
            ...prev,
            items: updatedItems,
            amount: calculateTotal(updatedItems) // Сума перераховується
        }));
    };

    // --- Зміна кількості В СПИСКУ ---
    const handleQuantityChangeInList = useCallback((index, newQuantityStr) => {
        const updatedItems = [...order.items];
        const item = updatedItems[index];
        if (!item) return;

        let newQuantity = parseInt(newQuantityStr, 10);
        let isValid = true;
        let errorMsg = '';

        if (isNaN(newQuantity) || newQuantityStr === '') {
            // Дозволяємо тимчасово порожнє поле або некоректне значення, але не оновлюємо суму
            updatedItems[index] = { ...item, quantity: newQuantityStr }; // Зберігаємо рядок для поля вводу
            setOrder(prev => ({ ...prev, items: updatedItems }));
            // Не перераховуємо суму і не видаляємо помилку одразу
            return; // Виходимо, щоб не перераховувати суму з NaN
        }

        if (newQuantity <= 0) {
            newQuantity = 1; // Мінімальна кількість - 1
            isValid = false; // Позначка, що значення було змінено
            // toast.warn(`Мінімальна кількість для "${item.name}" - 1`);
        }

        // Перевірка залишків
        const availableQty = getAvailableQuantity(item.productId, item.size);
        if (newQuantity > availableQty) {
            errorMsg = `На складі: ${availableQty}`;
            // Можна показати toast одразу, або почекати blur/submit
            // toast.error(`Недостатньо "${item.name}" (${item.size}). Доступно: ${availableQty}`);
        }

        // Оновлюємо помилки
        setItemQuantityErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            const key = `${item.productId}-${item.size}`;
            if (errorMsg) {
                newErrors[key] = errorMsg;
            } else {
                delete newErrors[key]; // Видаляємо помилку, якщо кількість коректна
            }
            return newErrors;
        });


        updatedItems[index] = { ...item, quantity: newQuantity };
        setOrder(prev => ({ ...prev, items: updatedItems }));
        recalculateTotalAmount(updatedItems); // Перераховуємо суму

        // Якщо значення було некоректним і виправлено на 1, оновлюємо поле вводу
        // Це відбувається асинхронно, тому може не спрацювати ідеально без додаткових ефектів
        // if (!isValid) {
        //     handleQuantityChangeInList(index, '1');
        // }

    }, [order?.items, getAvailableQuantity, calculateTotal, setOrder]); // Додав залежності

    // Обробник blur для поля кількості в списку
    const handleQuantityBlurInList = useCallback((index) => {
        const item = order?.items[index];
        if (!item) return;

        const currentQuantity = parseInt(item.quantity, 10); // Беремо поточне значення зі стану

        if (isNaN(currentQuantity) || currentQuantity <= 0) {
            // Якщо значення некоректне, встановлюємо 1
            handleQuantityChangeInList(index, '1');
        } else {
            // Якщо значення коректне, просто ще раз перевіряємо сток
            const availableQty = getAvailableQuantity(item.productId, item.size);
            setItemQuantityErrors(prevErrors => {
                const newErrors = { ...prevErrors };
                const key = `${item.productId}-${item.size}`;
                if (currentQuantity > availableQty) {
                    newErrors[key] = `На складі: ${availableQty}`;
                } else {
                    delete newErrors[key];
                }
                return newErrors;
            });
        }
    }, [order?.items, handleQuantityChangeInList, getAvailableQuantity]); // Додав залежності

    // --- Збереження змін ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return; // Запобігання подвійному кліку

        // Фінальна перевірка залишків для всіх АКТИВНИХ товарів
        let canSubmit = true;
        for (const item of order.items) {
            if (!item.removed) {
                const itemAvailableQty = getAvailableQuantity(item.productId, item.size);
                if (item.quantity > itemAvailableQty) {
                    toast.error(`Недостатньо "${item.name}" (${item.size}). На складі: ${itemAvailableQty}, у замовленні: ${item.quantity}.`);
                    canSubmit = false;
                    // Можна додати підсвітку проблемного рядка
                }
            }
        }
        if (!canSubmit) {
            toast.error("Неможливо зберегти замовлення через недостатню кількість товарів на складі.");
            return;
        }

        setIsSaving(true);
        try {
            // Готуємо дані: тільки активні товари, перерахована сума, причина
            const finalAmount = calculateTotal(order.items); // Перераховуємо точно перед відправкою
            const orderDataToSend = {
                items: order.items
                    .filter(item => !item.removed)
                    .map(({ discountedPrice, ...rest }) => rest), // Видаляємо тимчасове поле discountedPrice
                amount: finalAmount,
                editReason: editReason,
                // Передаємо також інші важливі поля, якщо вони є і не мають змінюватись
                // наприклад: status, payment, address, userId, deliveryDetails etc.
                ...(order.status && { status: order.status }),
                ...(order.payment !== undefined && { payment: order.payment }), // Якщо payment може бути false
                ...(order.address && { address: order.address }),
                ...(order.deliveryDetails && { deliveryDetails: order.deliveryDetails }),
                ...(order.userId && { userId: order.userId }),
            };

            const response = await axios.post(`${url}/api/order/edit-order/${id}`, orderDataToSend);

            if (response.data.success) {
                toast.success("Замовлення успішно оновлено!");
                navigate('/admin_panel/orders'); // Перехід до списку замовлень
            } else {
                toast.error(response.data.message || "Помилка при оновленні замовлення (відповідь сервера)");
            }
        } catch (error) {
            console.error("Помилка збереження замовлення:", error);
            const errorMsg = error.response?.data?.message || error.message || "Сталася невідома помилка";
            toast.error(`Помилка: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Рендеринг ---
    if (loading) {
        return (
            <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen flex justify-center items-center">
                <p className="text-gray-500 text-lg">Завантаження даних замовлення...</p>
            </section>
        );
    }

    if (!order) {
        return (
            <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen flex flex-col justify-center items-center">
                <p className="text-[#99120d] text-lg mb-4">Не вдалося завантажити замовлення для редагування.</p>
                <button
                    onClick={() => navigate('/admin_panel/orders')}
                    className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
                >
                    <FaArrowLeft /> До списку замовлень
                </button>
            </section>
        );
    }

    // Поточна розрахована сума активних товарів
    const currentOrderTotal = calculateTotal(order.items);

    return (
        <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen">
            <div className="w-full max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md print:shadow-none print:rounded-none print:p-4">
                <h4 className="text-xl font-semibold pb-4 mb-6 uppercase border-b text-gray-800">
                    Редагування замовлення № {order.orderNumber}
                </h4>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* --- Секція додавання товару --- */}
                    <fieldset className="border border-gray-300 p-4 rounded-md">
                        <legend className="text-base font-medium px-2 text-gray-700">Додати товар до замовлення</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
                            {/* Вибір товару */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="select-product" className="text-sm font-medium text-gray-600">Товар</label>
                                <select
                                    id="select-product"
                                    value={selectedProduct}
                                    onChange={handleSelectedProductChange}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm"
                                >
                                    <option value="" disabled>-- Оберіть товар --</option>
                                    {products.map(product => (
                                        <option key={product._id} value={product._id}>
                                            {product.name} ({product.price.toFixed(2)} грн{product.discount ? ` / -${product.discount}%` : ''})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Вибір розміру */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="select-size" className="text-sm font-medium text-gray-600">Розмір</label>
                                <select
                                    id="select-size"
                                    value={selectedSize}
                                    onChange={handleSelectedSizeChange}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm"
                                    disabled={!selectedProduct}
                                >
                                    <option value="" disabled>-- Розмір --</option>
                                    {selectedProduct &&
                                        products.find(p => p._id === selectedProduct)?.sizes
                                            ?.filter(size => size.quantity !== undefined) // Показуємо тільки ті, де є кількість
                                            ?.map(size => (
                                                <option key={size.size} value={size.size}>
                                                    {size.size} (Дост: {getAvailableQuantity(selectedProduct, size.size)})
                                                </option>
                                            ))}
                                </select>
                            </div>
                            {/* Кількість */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="select-quantity" className="text-sm font-medium text-gray-600">Кількість</label>
                                <input
                                    id="select-quantity"
                                    type="number"
                                    value={selectedQuantity}
                                    onChange={handleSelectedQuantityChange}
                                    onBlur={handleSelectedQuantityBlur}
                                    min="1"
                                    className={`border rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 h-[38px] transition duration-150 ease-in-out text-sm w-full ${addStockError ? 'border-[#99120d] focus:ring-[#99120d] focus:border-[#99120d]' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                                    disabled={!selectedSize}
                                    placeholder="1"
                                />
                                <div className="mt-1 min-h-[20px] text-xs text-[#7a0e0a] flex items-center gap-1">
                                    {addStockError && (
                                        <>
                                            <FaExclamationTriangle /> {addStockError}
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Кнопка Додати */}
                            <div className="flex flex-col gap-y-1 justify-end h-[62px]">
                                <button
                                    type="button"
                                    onClick={addProduct}
                                    className="w-full inline-flex items-center justify-center gap-x-2 px-3 py-1.5 bg-[#0a6e13] text-white font-medium rounded-lg shadow-sm hover:bg-[#08580f] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0a6e13] transition text-sm h-[38px] disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                                    disabled={!selectedProduct || !selectedSize}
                                >
                                    <FaPlus /> Додати
                                </button>
                            </div>
                        </div>
                    </fieldset>

                    {/* --- Список товарів у замовленні --- */}
                    <fieldset className="border border-gray-300 p-4 rounded-md">
                        <legend className="text-base font-medium px-2 text-gray-700">Склад замовлення</legend>
                        {order.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] border-collapse text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border text-left font-semibold text-gray-600">Назва товару</th>
                                            <th className="p-2 border text-center font-semibold text-gray-600 w-24">Розмір / Сток</th>
                                            <th className="p-2 border text-center font-semibold text-gray-600 w-20">К-ть</th>
                                            <th className="p-2 border text-right font-semibold text-gray-600 w-28">Ціна/шт.</th>
                                            <th className="p-2 border text-right font-semibold text-gray-600 w-32">Сума</th>
                                            <th className="p-2 border text-center font-semibold text-gray-600 w-20">Дія</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item, index) => {
                                            const currentAvailableQty = getAvailableQuantity(item.productId, item.size);
                                            const isInsufficient = !item.removed && item.quantity > currentAvailableQty;
                                            const itemRowClass = item.removed
                                                ? "bg-gray-100 text-gray-500 line-through italic"
                                                : isInsufficient ? "bg-red-50" : "";
                                            const finalItemPrice = item.discountedPrice * item.quantity;

                                            return (
                                                <tr key={`${item.productId}-${item.size}-${index}`} className={itemRowClass}>
                                                    <td className="p-2 border align-top">{item.name}</td>
                                                    <td className="p-2 border text-center align-top">
                                                        {item.size}
                                                        <div className={`text-xs mt-0.5 ${isInsufficient ? 'text-[#7a0e0a] font-semibold' : 'text-gray-500'}`}>
                                                            (Залишок: {currentAvailableQty})
                                                            {isInsufficient && <span className="block"><FaExclamationTriangle className="inline mr-1" />Недостатньо!</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-1 border text-center align-middle">
                                                        {item.removed ? (
                                                            <span className='text-gray-500'>{item.quantity}</span> // Показуємо кількість для видалених
                                                        ) : (
                                                            <div className='flex items-center justify-center gap-1'>
                                                                {/* Кнопка мінус */}
                                                                <button
                                                                    type='button'
                                                                    onClick={() => handleQuantityChangeInList(index, String(Number(item.quantity) - 1))}
                                                                    disabled={Number(item.quantity) <= 1} // Вимкнути, якщо кількість 1 або менше
                                                                    className='p-1 text-gray-500 hover:text-[#99120d] disabled:opacity-30'
                                                                    title="Зменшити кількість"
                                                                >
                                                                    <FaMinus size={12} />
                                                                </button>
                                                                {/* Поле вводу */}
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity} // Значення зі стану
                                                                    onChange={(e) => handleQuantityChangeInList(index, e.target.value)}
                                                                    onBlur={() => handleQuantityBlurInList(index)} // Викликаємо без значення
                                                                    min="1"
                                                                    className={`border rounded text-center outline-none focus:ring-1 focus:ring-offset-1 h-[30px] w-12 text-sm transition duration-150 ease-in-out ${isInsufficient ? 'border-[#99120d] focus:ring-[#99120d] focus:border-[#99120d]' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                                                                    aria-label={`Кількість для ${item.name}`}
                                                                    disabled={item.removed}
                                                                />
                                                                {/* Кнопка плюс */}
                                                                <button
                                                                    type='button'
                                                                    onClick={() => handleQuantityChangeInList(index, String(Number(item.quantity) + 1))}
                                                                    disabled={Number(item.quantity) >= currentAvailableQty} // Вимкнути, якщо досягнуто максимуму
                                                                    className='p-1 text-gray-500 hover:text-[#0a6e13] disabled:opacity-30'
                                                                    title="Збільшити кількість"
                                                                >
                                                                    <FaPlusCircle size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 border text-right align-top">
                                                        {item.discount > 0 ? (
                                                            <>
                                                                <span className="text-xs line-through text-gray-500">{item.price.toFixed(2)}</span><br />
                                                                <span className="font-medium">{item.discountedPrice.toFixed(2)} грн</span><br />
                                                                <span className="text-xs text-[#7a0e0a]">(-{item.discount}%)</span>
                                                            </>
                                                        ) : (
                                                            `${item.price.toFixed(2)} грн`
                                                        )}
                                                    </td>
                                                    <td className="p-2 border text-right align-top font-medium">
                                                        {finalItemPrice.toFixed(2)} грн
                                                    </td>
                                                    <td className="p-2 border text-center align-middle">
                                                        {item.removed ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => restoreProduct(index)}
                                                                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                                title="Відновити товар"
                                                                // Блокуємо відновлення, якщо недостатньо на складі
                                                                disabled={item.quantity > currentAvailableQty}
                                                            >
                                                                <FaUndo size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeProduct(index)}
                                                                className="p-1 text-[#99120d] hover:text-[#7a0e0a]"
                                                                title="Видалити товар із замовлення"
                                                            >
                                                                <FaTrash size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100">
                                            <td colSpan="4" className="p-2 border text-right font-semibold text-gray-700">Загальна сума активних товарів:</td>
                                            <td className="p-2 border text-right font-bold text-lg text-gray-800">
                                                {currentOrderTotal.toFixed(2)} грн
                                            </td>
                                            <td className="p-2 border"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic p-4 text-center">У замовленні ще немає товарів.</p>
                        )}
                    </fieldset>

                    {/* --- Причина редагування --- */}
                    <fieldset className="border border-gray-300 p-4 rounded-md">
                        <legend className="text-base font-medium px-2 text-gray-700">Причина редагування</legend>
                        <label htmlFor="editReasonSelect" className="block mb-1 text-sm font-medium text-gray-600">
                            Оберіть причину <span className="text-[#99120d]">*</span>
                        </label>
                        <select
                            id="editReasonSelect"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm"
                        >
                            <option value="" disabled>-- Оберіть причину --</option>
                            {editReasons.map((reason, index) => (
                                <option key={index} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>
                        {/* Можна додати textarea, якщо обрано "Інша причина" */}
                    </fieldset>

                    {/* --- Кнопки дій --- */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
                        <button
                            type="button"
                            onClick={() => navigate(-1)} // Назад до списку
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
                        >
                            <FaArrowLeft /> Скасувати
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                            disabled={isSaving} // Блокуємо під час збереження
                        >
                            <FaSave /> {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default EditOrder;
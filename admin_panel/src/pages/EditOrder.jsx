import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlus, FaTrash } from 'react-icons/fa';

const EditOrder = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editReason, setEditReason] = useState("");
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    // Дозволяємо selectedQuantity бути рядком для обробки порожнього введення
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [availableQuantities, setAvailableQuantities] = useState({});
    const [stockError, setStockError] = useState(""); // Стан для повідомлення про недостатню кількість

    const editReasons = [
        "Відсутність товару на складі.",
        "Дефект або пошкодження товару.",
        "Зміна доступних розмірів.",
        "Запит покупця.",
        "Технічні збої в системі."
    ];

    const calculateDiscountedPrice = (price, discount) => {
        return discount ? price * (100 - discount) / 100 : price;
    };

    const calculateTotal = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                const itemPrice = calculateDiscountedPrice(item.price, item.discount);
                return total + (itemPrice * item.quantity);
            }, 0);
    };

    const getAvailableQuantity = (productId = selectedProduct, size = selectedSize) => {
        if (!productId || !size) return 0;
        const key = `${productId}-${size}`;
        // Повертаємо 0, якщо кількість не визначена або відсутня
        return availableQuantities[key] === undefined ? 0 : availableQuantities[key];
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                const orderResponse = await axios.get(`${url}/api/order/edit-order/${id}`);
                if (orderResponse.data.success) {
                    // Переконуємось, що всі quantity в items є числами
                    const fetchedOrder = orderResponse.data.data;
                    fetchedOrder.items = fetchedOrder.items.map(item => ({
                        ...item,
                        quantity: parseInt(item.quantity, 10) || 1 // Парсимо і ставимо 1 якщо NaN
                    }));
                    setOrder(fetchedOrder);
                } else {
                    toast.error("Помилка завантаження замовлення");
                }

                const productsResponse = await axios.get(`${url}/api/product/list-product`);
                if (productsResponse.data.success) {
                    setProducts(productsResponse.data.data);

                    const quantitiesMap = {};
                    productsResponse.data.data.forEach(product => {
                        product.sizes.forEach(size => {
                            quantitiesMap[`${product._id}-${size.size}`] = parseInt(size.quantity, 10) || 0; // Парсимо і ставимо 0 якщо NaN
                        });
                    });
                    setAvailableQuantities(quantitiesMap);
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // --- ВИДАЛЕНО useEffect, що обмежував selectedQuantity ---
    // Цей useEffect більше не потрібен, оскільки ми хочемо дозволити
    // введення числа, більшого за доступне, і показувати помилку лише візуально
    // та при спробі додавання.
    /*
    useEffect(() => {
        if (selectedProduct && selectedSize) {
            const key = `${selectedProduct}-${selectedSize}`;
            const availableQty = availableQuantities[key] || 0;

            if (selectedQuantity > availableQty) {
                //setSelectedQuantity(availableQty); // НЕ обрізаємо значення
                setStockError(`На складі доступно лише ${availableQty} шт.`);
            } else {
                setStockError("");
            }
        } else {
             setStockError(""); // Очищаємо помилку, якщо продукт/розмір не обрано
        }
    }, [selectedProduct, selectedSize, selectedQuantity, availableQuantities]);
    */

    const addProduct = () => {
        if (!selectedProduct || !selectedSize) {
            toast.error("Будь ласка, оберіть товар та розмір");
            return;
        }
        // Перевіряємо, чи selectedQuantity є дійсним числом і більше 0
        const quantityToAdd = parseInt(selectedQuantity, 10);
        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            toast.error("Будь ласка, введіть коректну кількість (більше 0)");
            setSelectedQuantity(1); // Скидаємо на 1
            setStockError(''); // Очищаємо можливу помилку про залишки
            return;
        }


        const availableQty = getAvailableQuantity();

        // --- КЛЮЧОВА ПЕРЕВІРКА ---
        // Залишаємо перевірку саме тут, перед додаванням
        if (quantityToAdd > availableQty) {
            setStockError(`Недостатня кількість товару на складі. Доступно: ${availableQty} шт.`);
            // Додатково можна показати toast для більшої наочності
            toast.error(`Недостатньо товару на складі! Доступно: ${availableQty} шт.`);
            return; // Не додаємо товар
        }

        // Якщо перевірка пройдена
        setStockError(""); // Очищаємо помилку, якщо вона була

        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        const newItem = {
            productId: product._id,
            name: product.name,
            price: product.price,
            discount: product.discount || 0,
            size: selectedSize,
            quantity: quantityToAdd, // Використовуємо перевірену кількість
            image: product.images[0],
            removed: false,
            discountedPrice: calculateDiscountedPrice(product.price, product.discount)
        };

        setOrder(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            amount: calculateTotal([...prev.items, newItem])
        }));

        // Скидаємо поля після успішного додавання
        setSelectedProduct("");
        setSelectedSize("");
        setSelectedQuantity(1);
        setStockError(""); // Переконуємось, що помилка очищена
    };

    const removeProduct = (index) => {
        const updatedItems = [...order.items];
        updatedItems[index].removed = true;

        setOrder(prev => ({
            ...prev,
            items: updatedItems,
            amount: calculateTotal(updatedItems)
        }));
    };

    const restoreProduct = (index) => {
        const updatedItems = [...order.items];

        // Перевірка залишків перед відновленням
        const itemToRestore = updatedItems[index];
        const availableQty = getAvailableQuantity(itemToRestore.productId, itemToRestore.size);

        if (itemToRestore.quantity > availableQty) {
            toast.error(`Неможливо відновити "${itemToRestore.name}" (${itemToRestore.size}). Недостатньо на складі (${availableQty} шт. доступно).`);
            return;
        }

        updatedItems[index].removed = false;

        setOrder(prev => ({
            ...prev,
            items: updatedItems,
            amount: calculateTotal(updatedItems)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!editReason) {
            toast.error("Будь ласка, оберіть причину редагування");
            return;
        }

        // Додаткова перевірка перед збереженням: чи всі активні товари є в наявності
        let canSubmit = true;
        const currentQuantities = { ...availableQuantities }; // Копія для перевірки

        for (const item of order.items) {
            if (!item.removed) {
                const key = `${item.productId}-${item.size}`;
                const itemAvailableQty = currentQuantities[key] !== undefined ? currentQuantities[key] : 0;

                if (item.quantity > itemAvailableQty) {
                    toast.error(`Недостатньо товару "${item.name}" (${item.size}) на складі (${itemAvailableQty} доступно) для збереження замовлення.`);
                    canSubmit = false;
                    // Можна додати логіку для підсвічування проблемного рядка в таблиці
                }
                // В теорії, при редагуванні можна було б оновлювати `currentQuantities`
                // якби ми дозволяли змінювати кількість існуючих товарів.
                // Але зараз ми лише додаємо/видаляємо, тому перевіряємо поточні залишки.
            }
        }

        if (!canSubmit) {
            return; // Не відправляти форму, якщо є проблеми із залишками
        }


        try {
            const orderData = {
                // Передаємо лише ті товари, що не позначені як видалені
                items: order.items.filter(item => !item.removed),
                status: order.status, // Передаємо поточний статус
                payment: order.payment, // Передаємо поточний статус оплати
                address: order.address, // Передаємо адресу
                userId: order.userId, // Передаємо ID користувача
                // --- Важливо ---
                amount: calculateTotal(order.items.filter(item => !item.removed)), // Перераховуємо суму тільки для активних товарів
                editReason,
            };

            console.log("Дані для відправки:", orderData); // Для дебагу

            const response = await axios.post(`${url}/api/order/edit-order/${id}`, orderData);

            if (response.data.success) {
                toast.success("Замовлення успішно оновлено");
                navigate('/admin_panel/orders');
            } else {
                // Виводимо конкретне повідомлення з бекенду, якщо воно є
                toast.error(response.data.message || "Помилка при оновленні замовлення (бекенд)");
                console.error("Backend error message:", response.data.message);
            }
        } catch (error) {
            toast.error("Помилка при оновленні замовлення (клієнт)");
            console.error("Frontend error:", error);
            if (error.response) {
                // Якщо є відповідь від сервера з помилкою
                console.error("Server response data:", error.response.data);
                console.error("Server response status:", error.response.status);
                toast.error(`Помилка сервера: ${error.response.data.message || error.response.status}`);
            }
        }
    };

    // Обробник зміни кількості в полі вводу
    const handleQuantityChange = (e) => {
        const inputValue = e.target.value;

        // Дозволяємо порожній рядок для зручності введення
        if (inputValue === '') {
            setSelectedQuantity('');
            setStockError(''); // Очищаємо помилку, якщо поле порожнє
            return;
        }

        const numericValue = parseInt(inputValue, 10);

        // Перевіряємо, чи це число
        if (!isNaN(numericValue)) {
            // Дозволяємо будь-яке позитивне число, навіть > 0 (але не 0 чи від'ємне)
            const valueToSet = Math.max(1, numericValue); // Не дозволяємо 0 або менше
            setSelectedQuantity(valueToSet);

            // Оновлюємо помилку запасів, якщо потрібно, АЛЕ НЕ змінюємо valueToSet
            const maxQty = getAvailableQuantity();
            if (valueToSet > maxQty) {
                setStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setStockError(""); // Очищаємо помилку, якщо кількість в межах норми
            }
        } else {
            // Якщо введено не число, можна або ігнорувати, або скинути на 1
            // Поточна логіка: якщо було не число, стан не зміниться,
            // але при blur спрацює перевірка і встановить 1.
        }
    };

    // Обробник втрати фокусу полем кількості
    const handleQuantityBlur = () => {
        // Якщо поле порожнє або значення <= 0 після введення, встановлюємо 1
        const currentQuantity = parseInt(selectedQuantity, 10);
        if (isNaN(currentQuantity) || currentQuantity <= 0) {
            setSelectedQuantity(1);
            // Перевіряємо помилку для значення 1
            const maxQty = getAvailableQuantity();
            if (1 > maxQty) {
                setStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setStockError("");
            }
        } else {
            // Якщо значення валідне, ще раз перевіряємо помилку (на випадок зміни розміру/товару)
            const maxQty = getAvailableQuantity();
            if (currentQuantity > maxQty) {
                setStockError(`На складі доступно лише ${maxQty} шт.`);
            } else {
                setStockError("");
            }
        }
    };

    if (loading) return <div className="p-10 w-full bg-primary/20 pl-[16%]">Завантаження...</div>;
    if (!order) return <div className="p-10 w-full bg-primary/20 pl-[16%]">Замовлення не знайдено</div>;

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Редагування замовлення №{order.orderNumber}</h4>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Додавання нового товару */}
                    <div className="p-4 rounded-lg border border-gray-200 shadow-sm"> {/* Додав рамку і тінь */}
                        <h5 className="bold-18 mb-4">Додати товар</h5>
                        <div className="flex flex-wrap gap-4 items-start"> {/* Змінив items-center на items-start */}
                            <select
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    setSelectedSize(""); // Скидаємо розмір при зміні товару
                                    setSelectedQuantity(1); // Скидаємо кількість
                                    setStockError(""); // Очищаємо помилку
                                }}
                                className="p-2 border rounded flex-1 min-w-[200px]"
                            >
                                <option value="">Оберіть товар</option>
                                {products.map(product => (
                                    <option key={product._id} value={product._id}>
                                        {product.name} ({product.price} грн{product.discount ? `, знижка ${product.discount}%` : ''})
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedSize}
                                onChange={(e) => {
                                    setSelectedSize(e.target.value);
                                    setSelectedQuantity(1); // Скидаємо кількість при зміні розміру
                                    setStockError(''); // Очищаємо помилку
                                    // Одразу перевіримо сток для нового розміру зі значенням 1
                                    const maxQty = getAvailableQuantity(selectedProduct, e.target.value);
                                    if (1 > maxQty) {
                                        setStockError(`На складі доступно лише ${maxQty} шт.`);
                                    }
                                }}
                                className="p-2 border rounded flex-1 min-w-[150px]"
                                disabled={!selectedProduct}
                            >
                                <option value="">Оберіть розмір</option>
                                {selectedProduct &&
                                    products.find(p => p._id === selectedProduct)?.sizes
                                        ?.filter(size => size.quantity !== undefined) // Фільтруємо розміри без кількості, якщо такі є
                                        ?.map(size => (
                                            <option key={size.size} value={size.size}>
                                                {size.size} (доступно: {size.quantity})
                                            </option>
                                        ))}
                            </select>

                            <div className="flex flex-col"> {/* Зробив колонку для input і напису */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={selectedQuantity}
                                        onChange={handleQuantityChange} // Використовуємо новий обробник
                                        onBlur={handleQuantityBlur}      // Використовуємо обробник втрати фокусу
                                        min="1"
                                        // --- ВИДАЛЕНО max атрибут ---
                                        // max={getAvailableQuantity()}
                                        className={`p-2 border rounded w-24 ${stockError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`} // Динамічна рамка
                                        disabled={!selectedSize}
                                        placeholder="К-сть" // Додав плейсхолдер
                                    />
                                    <span className="text-sm text-gray-600 whitespace-nowrap">
                                        Доступно: {getAvailableQuantity()}
                                    </span>
                                </div>
                                {stockError && (
                                    <div className="mt-1 text-red-600 text-xs w-full"> {/* Зробив текст меншим */}
                                        {stockError}
                                    </div>
                                )}
                            </div>


                            <button
                                type="button"
                                onClick={addProduct}
                                className="px-4 py-2 bg-[#41af32] text-white rounded hover:bg-[#077014] flex items-center gap-2 self-start" // Вирівнювання кнопки
                                disabled={!selectedSize || !selectedProduct} // Блокуємо кнопку, якщо не обрано товар/розмір
                            >
                                <FaPlus /> Додати
                            </button>
                        </div>
                        {/* Прибрав дублювання помилки тут, вона тепер під полем вводу */}
                        {/* {stockError && ( ... )} */}
                    </div>

                    {/* Список товарів */}
                    <div>
                        <h5 className="bold-18 mb-4">Товари у замовленні</h5>
                        {order.items.length > 0 ? (
                            <table className="w-full border-collapse border">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 border">Назва</th>
                                        <th className="p-2 border">Розмір</th>
                                        <th className="p-2 border">Кількість</th>
                                        <th className="p-2 border">Ціна за од.</th>
                                        <th className="p-2 border">Сума</th>
                                        <th className="p-2 border">Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, index) => {
                                        const discountedPrice = calculateDiscountedPrice(item.price, item.discount);
                                        const totalPrice = discountedPrice * item.quantity;
                                        // Отримуємо АКТУАЛЬНУ доступну кількість для цього товару/розміру
                                        const currentAvailableQty = getAvailableQuantity(item.productId, item.size);
                                        // Перевірка, чи перевищує кількість у замовленні поточну доступну
                                        const isInsufficient = !item.removed && item.quantity > currentAvailableQty;

                                        return (
                                            <tr key={index} className={`${item.removed ? "bg-red-50 text-gray-400 line-through" : ""} ${isInsufficient ? "bg-yellow-50 border-l-4 border-yellow-400" : ""}`}> {/* Стилізація видалених та недостатніх */}
                                                <td className="p-2 border">{item.name}</td>
                                                <td className="p-2 border text-center">
                                                    {item.size}
                                                    <div className={`text-xs ${isInsufficient ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                                        На складі: {currentAvailableQty}
                                                        {isInsufficient && <span className="block">(Недостатньо!)</span>}
                                                    </div>
                                                </td>
                                                <td className={`p-2 border text-center ${isInsufficient ? 'font-bold text-red-600' : ''}`}>
                                                    {item.quantity}
                                                </td>
                                                <td className="p-2 border text-center">
                                                    {item.discount ? (
                                                        <>
                                                            <span className="line-through text-gray-500">{item.price.toFixed(2)} грн</span> {/* Додав toFixed */}
                                                            <br />
                                                            <span className="text-red-600 font-bold">{discountedPrice.toFixed(2)} грн</span>
                                                            <br />
                                                            <span className="text-sm text-[#077014]">-{item.discount}%</span>
                                                        </>
                                                    ) : (
                                                        <span>{item.price.toFixed(2)} грн</span>
                                                    )}
                                                </td>
                                                <td className="p-2 border text-center">
                                                    {item.discount ? (
                                                        <>
                                                            <span className="line-through text-gray-500">{(item.price * item.quantity).toFixed(2)} грн</span>
                                                            <br />
                                                            <span className="text-red-600 font-bold">{totalPrice.toFixed(2)} грн</span>
                                                        </>
                                                    ) : (
                                                        <span>{(item.price * item.quantity).toFixed(2)} грн</span>
                                                    )}
                                                </td>
                                                <td className="p-2 border text-center">
                                                    {item.removed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => restoreProduct(index)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium" // Змінив колір
                                                            title="Відновити"
                                                        >
                                                            Відновити
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProduct(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Видалити"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100">
                                        <td colSpan="4" className="p-2 border text-right font-bold">Загальна сума (активних товарів):</td>
                                        <td className="p-2 border text-center font-bold">
                                            {calculateTotal(order.items).toFixed(2)} грн
                                        </td>
                                        <td className="p-2 border"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        ) : (
                            <p className="text-gray-500">У замовленні ще немає товарів.</p>
                        )}

                    </div>

                    {/* Причина редагування */}
                    <div>
                        <label className="block mb-2 font-medium">Причина редагування <span className="text-red-500">*</span></label> {/* Додав зірочку */}
                        <select
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full p-2 border rounded"
                            required // Додав required
                        >
                            <option value="">Оберіть причину...</option>
                            {editReasons.map((reason, index) => (
                                <option key={index} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Кнопки */}
                    <div className="flex justify-end gap-4 pt-4 border-t"> {/* Додав відступ зверху і лінію */}
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800" // Збільшив padding
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            className="btn-dark sm:w-auto px-6 flexCenter gap-x-2 !py-2 rounded" // Зробив ширину авто і збільшив padding
                        >
                            <FaSave /> Зберегти зміни
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default EditOrder;
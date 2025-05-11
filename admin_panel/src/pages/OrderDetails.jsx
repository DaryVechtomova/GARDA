import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { FaChevronDown, FaChevronUp, FaPrint, FaArrowLeft, FaEdit, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const OrderDetails = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [productStocks, setProductStocks] = useState({});
    const [expandedHistory, setExpandedHistory] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelComment, setCancelComment] = useState("");
    const [isCanceling, setIsCanceling] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Стан для блокування кнопки оновлення

    const cancellationReasons = [
        "Відсутність товару на складі.",
        "Дефект або пошкодження товару.",
        "Проблеми з оплатою.",
        "Некоректні контактні дані.",
        "Покупець не виходить на зв'язок.",
        "Підозра на шахрайство.",
        "Відмова служби доставки.",
        "Зміна цін або умов акції.",
        "Дублювання замовлення.",
        "Інша причина (вказати у коментарі)"
    ];

    // Послідовність статусів
    const statusFlow = [
        "Нове замовлення",
        "В обробці",
        "Передано в службу доставки",
        "Чекає на отримання",
        "Доставлено",
    ];

    // Стилі для статусів
    const getStatusStyle = (status) => {
        switch (status) {
            case "Нове замовлення": return "bg-blue-100 text-blue-800";
            case "В обробці": return "bg-yellow-100 text-yellow-800";
            case "Передано в службу доставки": return "bg-purple-100 text-purple-800";
            case "Чекає на отримання": return "bg-orange-100 text-orange-800";
            case "Доставлено": return "bg-green-100 text-green-800";
            case "Скасовано": return "bg-red-100 text-[#7a0e0a]";
            case "Повернення": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // --- Функції ---
    const fetchOrderDetails = async () => {
        setLoading(true); // Починаємо завантаження
        try {
            const response = await axios.get(`${url}/api/order/details/${id}`);
            if (response.data.success && response.data.data) {
                setOrder(response.data.data);
                // Отримуємо залишки тільки якщо статус дозволяє редагування або це нове замовлення
                if (["Нове замовлення", "В обробці"].includes(response.data.data.status)) {
                    fetchProductStocks(response.data.data.items);
                }
            } else {
                toast.error(response.data.message || "Помилка завантаження даних замовлення");
                setOrder(null); // Скидаємо замовлення у разі помилки
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані замовлення");
            console.error("Помилка отримання деталей замовлення:", error);
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductStocks = async (items) => {
        const stockPromises = items.map(async (item) => {
            if (item.removed) return { productId: item.productId, quantity: 0 }; // Не перевіряємо видалені
            try {
                const productResponse = await axios.get(`${url}/api/product/details/${item.productId}`);
                if (productResponse.data.success) {
                    const product = productResponse.data.data;
                    const sizeInfo = product.sizes?.find(size => size.size === item.size);
                    return {
                        productId: item.productId,
                        size: item.size, // Додаємо розмір для унікальності ключа
                        quantity: sizeInfo ? sizeInfo.quantity : 0
                    };
                }
                return { productId: item.productId, size: item.size, quantity: 0 };
            } catch (error) {
                console.error(`Помилка отримання залишків для ${item.productId} (${item.size}):`, error);
                return { productId: item.productId, size: item.size, quantity: 0 };
            }
        });

        const stockResults = await Promise.all(stockPromises);
        const stocks = stockResults.reduce((acc, result) => {
            // Створюємо унікальний ключ: productId-size
            acc[`${result.productId}-${result.size}`] = result.quantity;
            return acc;
        }, {});

        setProductStocks(stocks);
    };


    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        } else {
            setLoading(false);
            toast.error("ID замовлення не вказано.");
            navigate("/admin_panel/list-orders"); // або кудись ще
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, url]); // Не додаємо navigate до залежностей, щоб уникнути циклу


    const updateOrderStatus = async () => {
        if (!order || isUpdatingStatus) return; // Захист від повторних кліків

        const currentIndex = statusFlow.indexOf(order.status);
        const nextStatus = statusFlow[currentIndex + 1];

        if (!nextStatus) {
            toast.info("Це кінцевий статус.");
            return;
        }

        setIsUpdatingStatus(true); // Блокуємо кнопку
        try {
            const response = await axios.put(`${url}/api/order/update-status/${order._id}`, {
                status: nextStatus,
            });

            if (response.data.success) {
                toast.success(`Статус оновлено на "${nextStatus}"`);
                // Оновлюємо стан локально для миттєвого відображення
                setOrder(prev => ({ ...prev, status: nextStatus, editHistory: response.data.data?.editHistory || prev.editHistory }));
                // fetchOrderDetails(); // Можна оновити повністю, якщо потрібно
            } else {
                toast.error(response.data.message || "Помилка при оновленні статусу");
            }
        } catch (error) {
            toast.error("Не вдалося оновити статус");
            console.error("Помилка при оновленні статусу:", error.response?.data || error.message);
        } finally {
            setIsUpdatingStatus(false); // Розблоковуємо кнопку
        }
    };

    const handleCancelOrder = async () => {
        let reasonToSend = cancelReason;
        if (cancelReason.includes("Інша причина")) {
            if (!cancelComment.trim()) {
                toast.error("Будь ласка, вкажіть детальну причину у коментарі.");
                return;
            }
            reasonToSend = cancelComment.trim();
        }

        if (!reasonToSend) {
            toast.error("Будь ласка, оберіть або вкажіть причину скасування.");
            return;
        }

        setIsCanceling(true);
        try {
            const response = await axios.put(`${url}/api/order/cancel/${order._id}`, {
                reason: reasonToSend,
                // comment: cancelComment // Коментар вже включено в reasonToSend, якщо обрано "Інша причина"
            });

            if (response.data.success) {
                toast.success("Замовлення успішно скасовано");
                setOrder(prev => ({ ...prev, status: "Скасовано", editHistory: response.data.data?.editHistory || prev.editHistory }));
                closeCancelModal();
            } else {
                toast.error(response.data.message || "Помилка при скасуванні замовлення");
            }
        } catch (error) {
            toast.error("Не вдалося скасувати замовлення");
            console.error("Помилка при скасуванні:", error.response?.data || error.message);
        } finally {
            setIsCanceling(false);
        }
    };

    const closeCancelModal = () => {
        setIsCancelModalOpen(false);
        setCancelReason("");
        setCancelComment("");
    }

    const formatEditDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("uk-UA", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit"
            });
        } catch (e) {
            return "Invalid Date";
        }
    };

    const calculateTotalWithoutDiscount = (items = []) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0);
    };

    const calculateTotalDiscount = (items = []) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                const price = item.price || 0;
                const quantity = item.quantity || 0;
                const discount = item.discount || 0;
                if (discount > 0) {
                    return total + (price * quantity * discount) / 100;
                }
                return total;
            }, 0);
    };

    const calculateTotalWithDiscount = (items = []) => {
        return calculateTotalWithoutDiscount(items) - calculateTotalDiscount(items);
    };

    // --- Рендеринг ---
    if (loading) {
        return (
            <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen flex justify-center items-center">
                <p className="text-gray-500 text-lg">Завантаження деталей замовлення...</p>
            </section>
        );
    }

    if (!order) {
        return (
            <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen flex flex-col justify-center items-center">
                <p className="text-[#99120d] text-lg mb-4">Не вдалося завантажити замовлення.</p>
                <button
                    onClick={() => navigate('/admin_panel/list-orders')} // Змінено шлях
                    className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
                >
                    <FaArrowLeft /> До списку замовлень
                </button>
            </section>
        );
    }

    const renderEditHistory = (edit) => {
        if (edit.type === 'status_change') {
            return (
                <div>
                    <p>Статус змінено з "<span className="font-medium">{edit.oldStatus}</span>" на "<span className="font-medium">{edit.newStatus}</span>"</p>
                </div>
            );
        }

        // Для звичайних змін у замовленні
        return (
            <>
                {edit.changes?.items?.length > 0 && (
                    <ul className="list-disc pl-5 mt-1">
                        {edit.changes.items.map((change, idx) => {
                            let actionText = '';
                            let details = '';

                            if (change.action === 'added') {
                                actionText = 'Додано';
                                details = `${change.quantity} шт.`;
                            }
                            else if (change.action === 'removed') {
                                actionText = 'Видалено';
                                details = `${change.quantity || '?'} шт.`;
                            }
                            else if (change.action === 'quantity_changed') {
                                actionText = 'Змінено кількість';
                                details = `з ${change.oldQuantity} на ${change.newQuantity} шт.`;
                            }

                            return (
                                <li key={idx}>
                                    <span className="font-medium">{actionText}</span> товар: {change.name || 'Невідомий товар'}
                                    {change.size && ` (${change.size})`}
                                    {details && `, ${details}`}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {edit.changes?.amountChanged && (
                    <p className="mt-1">
                        Сума змінена з {edit.changes.oldAmount.toFixed(2)} грн на {edit.changes.newAmount.toFixed(2)} грн
                    </p>
                )}
            </>
        );
    };

    const renderAmountChanges = (changes) => {
        if (!changes || !changes.amountChanged) return null;

        return (
            <p className="mt-2">
                Сума змінена з {changes.oldAmount.toFixed(2)} грн на {changes.newAmount.toFixed(2)} грн
            </p>
        );
    };

    const canUpdateStatus = order.status !== "Скасовано" && order.status !== "Повернення" && order.status !== "Доставлено";
    const canCancelOrder = ["Нове замовлення", "В обробці"].includes(order.status);
    const canEditOrder = ["Нове замовлення", "В обробці"].includes(order.status);
    const currentTotal = calculateTotalWithDiscount(order.items);
    const totalDiscount = calculateTotalDiscount(order.items);

    return (
        <section className="p-6 md:p-10 w-full bg-gray-100 min-h-screen print:bg-white print:p-0">
            <div className="w-full max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md print:shadow-none print:rounded-none print:p-4">

                {/* --- Заголовок та Основна інформація --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-4 border-b print:border-b-0 print:pb-2 print:mb-2">
                    <div>
                        <h4 className="text-xl font-semibold uppercase text-black mb-2 print:text-lg">
                            Замовлення № {order.orderNumber}
                        </h4>
                        <p className="text-sm text-gray-500 print:text-xs">
                            Дата: {formatEditDate(order.date)}
                        </p>
                        <div className="mt-2 print:hidden">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(order.status)}`}>
                                {order.status}
                            </span>
                            {order.status === "Скасовано" && order.cancellationReason && (
                                <p className="text-xs text-[#99120d] mt-1 italic">Причина: {order.cancellationReason}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0 no-print">
                        {canCancelOrder && (
                            <button
                                onClick={() => setIsCancelModalOpen(true)}
                                className="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-[#99120d] text-white text-xs font-semibold rounded-md shadow-sm hover:bg-[#7a0e0a] transition disabled:opacity-50"
                                title="Скасувати замовлення"
                            >
                                <FaTimes /> Скасувати
                            </button>
                        )}
                        {canUpdateStatus && (
                            <button
                                onClick={updateOrderStatus}
                                className="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-[#fbb42c] text-black text-xs font-semibold rounded-md shadow-sm hover:bg-[#e4a426] transition disabled:opacity-50"
                                title={`Оновити статус на "${statusFlow[statusFlow.indexOf(order.status) + 1] || ''}"`}
                                disabled={isUpdatingStatus}
                            >
                                <FaCheck /> {isUpdatingStatus ? "Оновлення..." : "Наст. статус"}
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Інформація про Клієнта та Доставку --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4 print:mb-4">
                    <div className="p-4 rounded-md border">
                        <h5 className="text-base font-semibold text-black mb-2">Інформація про клієнта</h5>
                        <p className="text-sm mb-1"><span className="font-medium text-gray-700">Ім'я:</span> {order.deliveryDetails.secondName} {order.deliveryDetails.firstName} {order.deliveryDetails.middleName}</p>
                        <p className="text-sm"><span className="font-medium text-gray-700">Телефон:</span> {order.deliveryDetails.phone}</p>
                        {/* Додати Email, якщо є */}
                        <p className="text-sm"><span className="font-medium text-gray-700">Email:</span> {order.userEmail || 'Не вказано'}</p>
                    </div>
                    <div className="p-4 rounded-md border">
                        <h5 className="text-base font-semibold text-black mb-2">Інформація про доставку</h5>
                        <p className="text-sm mb-1"><span className="font-medium text-gray-700">Спосіб:</span> {order.deliveryMethod}</p>
                        <div className="text-sm">
                            <span className="font-medium text-gray-700">Адреса:</span>{' '}
                            <span className="text-gray-500">
                                {' '}
                                {order.deliveryMethod === "Нова Пошта" && `${order.deliveryDetails.region} область, м. ${order.deliveryDetails.city}, Відділення №${order.deliveryDetails.departmentNumber}`}

                                {order.deliveryMethod === "Укрпошта" && `${order.deliveryDetails.region} область, м. ${order.deliveryDetails.city}, ${order.deliveryDetails.street} ${order.deliveryDetails.houseNumber}${order.deliveryDetails.apartment ? ', кв. ' + order.deliveryDetails.apartment : ''}, поштовий індекс: ${order.deliveryDetails.postalCode}`}

                                {order.deliveryMethod === "Самовивіз" && `м. ${order.deliveryDetails.city}`}
                            </span>
                        </div>
                        {order.paymentMethod && (
                            <div>
                                <p className="text-sm mb-1">
                                    <span className="text-sm font-medium text-gray-700 mb-1">Оплата:</span>{' '}
                                    {order.paymentMethod === "payOnDelivery" && "Оплата при отриманні"}
                                    {order.paymentMethod === "payNow" && "Онлайн оплата карткою"}
                                    {/* Додай інші варіанти, якщо вони є */}
                                    {order.paymentMethod !== "payOnDelivery" && order.paymentMethod !== "payNow" && order.paymentMethod /* Якщо невідомий метод, показуємо як є */}
                                </p>
                            </div>
                        )}
                    </div>
                </div>


                {/* --- Таблиця з товарами --- */}
                <div className="mb-6 print:mb-4 overflow-x-auto">
                    <h5 className="text-base font-semibold text-black mb-2 print:hidden">Склад замовлення</h5>
                    <table className="w-full min-w-[600px] border-collapse text-sm">
                        <thead className="bg-gray-100 print:hidden">
                            <tr>
                                <th className="p-2 border text-left font-semibold text-gray-600 w-16">Фото</th>
                                <th className="p-2 border text-left font-semibold text-gray-600">Назва товару</th>
                                <th className="p-2 border text-center font-semibold text-gray-600 w-20">Розмір</th>
                                <th className="p-2 border text-right font-semibold text-gray-600 w-24">Ціна/шт.</th>
                                <th className="p-2 border text-center font-semibold text-gray-600 w-16">К-ть</th>
                                <th className="p-2 border text-right font-semibold text-gray-600 w-28">Сума</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.filter(item => !item.removed).map((item, index) => {
                                const stockKey = `${item.productId}-${item.size}`;
                                const currentStock = productStocks[stockKey];
                                const hasStockIssue = currentStock !== undefined && currentStock < item.quantity;
                                const itemTotal = item.price * item.quantity;
                                const itemDiscountAmount = (item.discount > 0) ? (itemTotal * item.discount / 100) : 0;
                                const itemFinalPrice = itemTotal - itemDiscountAmount;

                                return (
                                    <tr key={`${item.productId}-${item.size}-${index}`} className={`border-b ${hasStockIssue ? 'bg-red-50 print:bg-transparent' : ''} print:border-gray-300`}>
                                        <td className="p-2 border align-top print:hidden">
                                            <img
                                                src={`${url}/images/${item.image}`}
                                                alt={item.name}
                                                className="h-12 w-12 object-cover rounded shadow-sm"
                                                onError={(e) => { e.target.src = '/placeholder-image.png'; }} // Додати плейсхолдер
                                            />
                                        </td>
                                        <td className="p-2 border align-top print:p-1 print:border-0">
                                            {item.name}
                                            {hasStockIssue && canEditOrder && (
                                                <div className="text-xs text-[#99120d] font-medium mt-1 flex items-center gap-1 no-print">
                                                    <FaExclamationTriangle /> Недостатньо на складі! (Є: {currentStock})
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2 border text-center align-top print:p-1 print:border-0">{item.size}</td>
                                        <td className="p-2 border text-right align-top print:p-1 print:border-0">
                                            {item.price.toFixed(2)} грн
                                            {item.discount > 0 && (
                                                <div className="text-xs text-[#99120d]">(-{item.discount}%)</div>
                                            )}
                                        </td>
                                        <td className="p-2 border text-center align-top print:p-1 print:border-0">{item.quantity}</td>
                                        <td className="p-2 border text-right align-top print:p-1 print:border-0 font-medium">
                                            {itemFinalPrice.toFixed(2)} грн
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* --- Підсумки --- */}
                <div className="flex justify-end mb-6 print:mb-4 print:mt-4 print:border-t print:pt-2">
                    <div className="w-full max-w-xs text-sm">
                        <div className="flex justify-between py-1">
                            <span className="text-gray-600">Проміжний підсумок:</span>
                            <span className="text-gray-800">{calculateTotalWithoutDiscount(order.items).toFixed(2)} грн</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between py-1 border-b">
                                <span className="text-gray-600">Знижка:</span>
                                <span className="text-[#99120d]">-{totalDiscount.toFixed(2)} грн</span>
                            </div>
                        )}
                        {/* Можливо доставка? */}
                        {/* <div className="flex justify-between py-1 border-b">
                             <span className="text-gray-600">Доставка:</span>
                             <span className="text-gray-800">{order.shippingCost?.toFixed(2) || '0.00'} грн</span>
                         </div> */}
                        <div className="flex justify-between py-2 mt-1">
                            <span className="font-semibold text-base text-black">Всього до сплати:</span>
                            <span className="font-semibold text-base text-black">{currentTotal.toFixed(2)} грн</span>
                        </div>
                    </div>
                </div>


                {/* --- Історія змін --- */}
                {order.editHistory && order.editHistory.length > 0 && (
                    <div className="mt-6 p-4 rounded-md border print:hidden">
                        <div
                            className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded"
                            onClick={() => setExpandedHistory(!expandedHistory)}
                        >
                            <h5 className="text-base font-semibold text-black">
                                Історія змін ({order.editHistory.length})
                            </h5>
                            {expandedHistory ? <FaChevronUp /> : <FaChevronDown />}
                        </div>

                        {expandedHistory && (
                            <div className="space-y-3 mt-4 border-t pt-3">
                                {[...order.editHistory].reverse().map((edit, index) => (
                                    <div key={index} className="text-xs border-b pb-3 last:border-0">
                                        <p className="font-medium text-gray-600">
                                            {formatEditDate(edit.date)}
                                        </p>
                                        <p className="text-gray-500">
                                            Користувач: <span className="font-medium">{edit.editedBy?.name || 'Система'}</span>
                                        </p>
                                        {edit.reason && (
                                            <p className="text-gray-500">
                                                Причина: <span className="italic">{edit.reason}</span>
                                            </p>
                                        )}
                                        {renderEditHistory(edit)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- Кнопки дій внизу --- */}
                <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                    <button
                        onClick={() => navigate('/admin_panel/orders')}
                        className="inline-flex items-center gap-x-2 px-4 py-2 btn-dark text-white font-medium rounded-lg shadow-sm  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:bg-tertiary transition text-sm"
                    >
                        <FaArrowLeft /> До списку замовлень
                    </button>

                    <div className="flex gap-3">
                        {canEditOrder && (
                            <NavLink
                                to={`/admin_panel/edit-order/${order._id}`}
                                className="inline-flex items-center gap-x-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 transition text-sm"
                                title="Редагувати склад замовлення"
                            >
                                <FaEdit /> Редагувати
                            </NavLink>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
                        >
                            <FaPrint /> Друк / PDF
                        </button>
                    </div>
                </div>

                {/* Додатковий текст для друку */}
                <div className="hidden print:block text-center text-xs mt-6 border-t pt-4">
                    <p>Чек № {order.orderNumber} від {new Date(order.date).toLocaleDateString()}</p>
                    <p>Дякуємо за покупку!</p>
                    {/* Можна додати QR код або іншу інформацію */}
                </div>
            </div>

            {/* --- Модальне вікно скасування --- */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 no-print">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Скасування замовлення № {order.orderNumber}</h3>
                        <div className="mb-4">
                            <label htmlFor="cancelReasonSelect" className="block text-sm font-medium text-gray-600 mb-1">Причина скасування <span className="text-[#99120d]">*</span></label>
                            <select
                                id="cancelReasonSelect"
                                value={cancelReason}
                                onChange={(e) => {
                                    setCancelReason(e.target.value);
                                    // Очищаємо коментар, якщо обрано не "Інша причина"
                                    if (!e.target.value.includes("Інша причина")) {
                                        setCancelComment("");
                                    }
                                }}
                                className="w-full border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white text-sm"
                            >
                                <option value="" disabled>-- Оберіть причину --</option>
                                {cancellationReasons.map((reason, index) => (
                                    <option key={index} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {cancelReason.includes("Інша причина") && (
                            <div className="mb-4">
                                <label htmlFor="cancelComment" className="block text-sm font-medium text-gray-600 mb-1">Деталі (обов'язково) <span className="text-[#99120d]">*</span></label>
                                <textarea
                                    id="cancelComment"
                                    value={cancelComment}
                                    onChange={(e) => setCancelComment(e.target.value)}
                                    placeholder="Вкажіть детальну причину скасування..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px] transition duration-150 ease-in-out text-sm"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={closeCancelModal}
                                type="button"
                                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition"
                            >
                                Відмінити
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                type="button"
                                className="px-4 py-2 bg-[#99120d] text-white text-sm font-medium rounded-md hover:bg-[#7a0e0a] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                // Кнопка неактивна, якщо не вибрано причину АБО якщо обрано "Інша" і коментар порожній
                                disabled={!cancelReason || (cancelReason.includes("Інша причина") && !cancelComment.trim()) || isCanceling}
                            >
                                {isCanceling ? "Скасування..." : "Підтвердити"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default OrderDetails;
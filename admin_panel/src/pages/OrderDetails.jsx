import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaChevronDown, FaChevronUp, FaPrint, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

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

    // Fetch order details and product stock information
    const fetchOrderDetails = async () => {
        try {
            const response = await axios.get(`${url}/api/order/details/${id}`);
            if (response.data.success) {
                setOrder(response.data.data);

                // Отримуємо інформацію про залишки товарів
                const stockPromises = response.data.data.items.map(async (item) => {
                    try {
                        const productResponse = await axios.get(`${url}/api/product/details/${item.productId}`);
                        if (productResponse.data.success) {
                            const product = productResponse.data.data;
                            // Знаходимо кількість для конкретного розміру
                            const sizeInfo = product.sizes.find(size => size.size === item.size);
                            return {
                                productId: item.productId,
                                quantity: sizeInfo ? sizeInfo.quantity : 0
                            };
                        }
                        return {
                            productId: item.productId,
                            quantity: 0
                        };
                    } catch (error) {
                        console.error(`Помилка отримання товару ${item.productId}:`, error);
                        return {
                            productId: item.productId,
                            quantity: 0
                        };
                    }
                });

                const stockResults = await Promise.all(stockPromises);
                const stocks = {};

                stockResults.forEach(result => {
                    stocks[result.productId] = result.quantity;
                });

                setProductStocks(stocks);
            } else {
                toast.error("Помилка завантаження даних замовлення");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані замовлення");
            console.error("Помилка отримання деталей замовлення:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    // Функція для оновлення статусу замовлення
    // Функція для оновлення статусу замовлення
    const updateOrderStatus = async () => {
        try {
            if (!order) {
                toast.error("Замовлення не знайдено");
                return;
            }

            const statusFlow = [
                "Нове замовлення",
                "В обробці",
                "Передано в службу доставки",
                "Чекає на отримання",
                "Доставлено",
            ];
            const currentIndex = statusFlow.indexOf(order.status);
            const nextStatus = statusFlow[currentIndex + 1];

            if (!nextStatus) {
                toast.info("Це кінцевий статус, його не можна змінити");
                return;
            }

            const response = await axios.put(`${url}/api/order/update-status/${order._id}`, {
                status: nextStatus,
            });

            if (response.data.success) {
                toast.success("Статус замовлення оновлено");
                fetchOrderDetails();
            } else {
                toast.error(response.data.message || "Помилка при оновленні статусу");
            }
        } catch (error) {
            toast.error("Не вдалося оновити статус");
            console.error("Помилка при оновленні статусу:", error.response?.data || error.message);
        }
    };

    const cancelOrder = async (reasonToSend) => {
        if (!reasonToSend.trim()) {
            toast.error("Будь ласка, вкажіть причину скасування");
            return;
        }

        setIsCanceling(true);
        try {
            const response = await axios.put(`${url}/api/order/cancel/${order._id}`, {
                reason: reasonToSend,
                comment: cancelComment // Додаємо коментар, якщо він є
            });

            if (response.data.success) {
                toast.success("Замовлення успішно скасовано");
                fetchOrderDetails();
                setIsCancelModalOpen(false);
                setCancelReason("");
                setCancelComment("");
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

    const formatEditDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const calculateTotalWithoutDiscount = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const calculateTotalDiscount = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                if (item.discount) {
                    return total + (item.price * item.quantity * item.discount) / 100;
                }
                return total;
            }, 0);
    };

    const calculateTotalWithDiscount = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                if (item.discount) {
                    return total + (item.price * (100 - item.discount) / 100) * item.quantity;
                }
                return total + item.price * item.quantity;
            }, 0);
    };

    const renderDeliveryAddress = (order) => {
        const { deliveryMethod, deliveryDetails } = order;

        switch (deliveryMethod) {
            case "Нова Пошта":
                return (
                    <>
                        <span className="medium-16 text-black">
                            {deliveryDetails.region}, {deliveryDetails.city}
                        </span>
                    </>
                );
            case "Укрпошта":
                return (
                    <>
                        <br />
                        <span className="medium-16 text-black">
                            {deliveryDetails.region}, {deliveryDetails.city}
                        </span><br />
                        <span className="medium-16 text-black">
                            {deliveryDetails.street}, {deliveryDetails.houseNumber}
                        </span><br />
                        <span className="medium-16 text-black">
                            Поштовий індекс: {deliveryDetails.postalCode}
                        </span>
                    </>
                );
            case "Самовивіз":
                return (
                    <span className="medium-16 text-black">
                        м. {deliveryDetails.city}
                    </span>
                );
            default:
                return <span className="medium-16 text-black">Невідомий спосіб доставки</span>;
        }
    };

    const renderItemChanges = (changes) => {
        if (!changes || !changes.items) return null;

        return (
            <ul className="list-disc pl-5 mt-2">
                {changes.items.map((change, index) => {
                    const product = order.items.find(item => item.productId.toString() === change.productId.toString());
                    let actionText = '';

                    if (change.action === 'added') actionText = 'Додано';
                    if (change.action === 'removed') actionText = 'Видалено';
                    if (change.action === 'updated') actionText = 'Без змін';

                    return (
                        <li key={index}>
                            {actionText} товар: {product?.name || 'Невідомий товар'}
                            ({change.size || product?.size}), {change.quantity || product?.quantity} шт.
                        </li>
                    );
                })}
            </ul>
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

    if (loading) {
        return <div className="p-10 w-full bg-primary/20 pl-[16%]">Завантаження...</div>;
    }

    if (!order) {
        return <div className="p-10 w-full bg-primary/20 pl-[16%]">Замовлення не знайдено</div>;
    }

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%] print:p-0 print:bg-white print:print-content">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Деталі замовлення</h4>

                <div className="mb-6 print:mb-2 print:px-2">
                    <div className="grid grid-cols-2 gap-4 print:grid-cols-1">
                        <div>
                            <p className="medium-16 text-black print:text-sm"><strong>Дата:</strong> {new Date(order.date).toLocaleDateString()}</p>
                            <p className="medium-16 text-black print:text-sm"><strong>Замовлення №:</strong> {order.orderNumber}</p>
                            <p className="medium-16 text-black print:text-sm no-print"><strong>Статус:</strong> {order.status}</p>

                            {/* Додаємо кнопки управління статусом */}
                            <div className="flex gap-2 mt-2 no-print">
                                {(order.status === "Нове замовлення" || order.status === "В обробці") && (
                                    <button
                                        onClick={() => setIsCancelModalOpen(true)}
                                        className="px-3 py-1 bg-[#991211] text-white text-sm font-bold rounded-lg shadow-md hover:bg-red-600 transition"
                                        title="Скасувати замовлення"
                                    >
                                        Скасувати
                                    </button>
                                )}
                                {order.status !== "Скасовано" && order.status !== "Повернення" && order.status !== "Доставлено" && (
                                    <button
                                        onClick={updateOrderStatus}  // Removed the parameter
                                        className="px-3 py-1 bg-[#fbb42c] text-black text-sm font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition"
                                        title="Оновити статус"
                                    >
                                        Оновити статус
                                    </button>
                                )}

                            </div>
                        </div>
                        <div className="print:border-b print:border-black print:pb-2 print:mb-2">
                            <p className="medium-16 text-black print:text-sm"><strong>Клієнт:</strong> {order.deliveryDetails.secondName} {order.deliveryDetails.firstName}</p>
                            <p className="medium-16 text-black print:text-sm"><strong>Тел:</strong> {order.deliveryDetails.phone}</p>
                            <p className="medium-16 text-black print:text-sm"><strong>Доставка:</strong> {order.deliveryMethod}</p>
                        </div>
                    </div>
                </div>

                {/* Таблиця з товарами */}
                <table className="w-full border-collapse border border-gray-200 mb-6 print:border-0 print:mb-2 print:w-full">
                    <thead className="bg-gray-100 print:hidden">
                        <tr>
                            <th className="p-3 border">Зображення</th>
                            <th className="p-3 border">Назва</th>
                            <th className="p-3 border">Розмір</th>
                            <th className="p-3 border text-center">Ціна</th>
                            <th className="p-3 border text-center">Шт</th>
                            <th className="p-3 border text-center">Сума</th>
                            <th className="p-3 border text-center">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.filter(item => !item.removed).map((item, index) => (
                            <tr key={index} className="border-b print:border-b print:border-gray-300">
                                <td className="p-3 border print:hidden">
                                    <img
                                        src={`${url}/images/${item.image}`}
                                        alt="product"
                                        className="h-24 object-cover shadow-sm"
                                    />
                                </td>
                                <td className="p-3 border print:p-1 print:border-0 print:text-sm">
                                    {item.name}
                                </td>
                                <td className="p-3 border text-center print:p-1 print:border-0 print:text-sm">
                                    {item.size}
                                </td>
                                <td className="p-3 border text-center print:p-1 print:border-0 print:text-sm">
                                    <div>{item.price.toFixed(2)} UAH</div>
                                    {item.discount > 0 && (
                                        <div className="text-red-600 text-xs">
                                            Знижка {item.discount}%
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 border text-center print:p-1 print:border-0 print:text-sm">
                                    <div className="font-medium">{item.quantity}</div>
                                    {order.status === "Нове замовлення" && productStocks[item.productId] !== undefined && (
                                        <div className={`text-xs no-print ${productStocks[item.productId] < item.quantity ? 'text-red-600' : 'text-gray-500'}`}>
                                            На складі: {productStocks[item.productId]} шт.
                                            {productStocks[item.productId] < item.quantity && (
                                                <span className="block text-red-600">Недостатньо!</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 border text-center print:p-1 print:border-0 print:text-sm">
                                    {item.discount ? (
                                        <span>
                                            {(item.price * item.quantity * (100 - item.discount) / 100).toFixed(2)} UAH
                                        </span>
                                    ) : (
                                        <span>{(item.price * item.quantity).toFixed(2)} UAH</span>
                                    )}
                                </td>
                                <td className="p-3 border text-center print:hidden">
                                    <span className="text-[#077014] font-bold">Активний</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Підсумки */}
                <div className="mb-6 print:mb-2 print:px-2 print:border-t print:border-black print:pt-2">
                    <p className="medium-16 text-black print:text-sm"><strong>Сума:</strong> {calculateTotalWithoutDiscount(order.items).toFixed(2)} грн</p>
                    {calculateTotalDiscount(order.items) > 0 && (
                        <p className="medium-16 text-black print:text-sm"><strong>Знижка:</strong> -{calculateTotalDiscount(order.items).toFixed(2)} грн</p>
                    )}
                    <p className="medium-16 text-black print:text-lg print:font-bold"><strong>До сплати:</strong> {calculateTotalWithDiscount(order.items).toFixed(2)} грн</p>
                </div>

                {/* Історія змін - тепер згортається/розгортається */}
                {order.editHistory && order.editHistory.length > 0 && (
                    <div className="mt-8 bg-white p-6 rounded-lg shadow print:hidden">
                        <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => setExpandedHistory(!expandedHistory)}
                        >
                            <h4 className="bold-20 text-gray-800">Історія змін замовлення</h4>
                            {expandedHistory ? <FaChevronUp /> : <FaChevronDown />}
                        </div>

                        {expandedHistory && (
                            <div className="space-y-4 mt-4">
                                {order.editHistory.map((edit, index) => (
                                    <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {formatEditDate(edit.date)} - {edit.reason}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Змінено користувачем: {edit.editedBy}
                                                </p>
                                            </div>
                                        </div>
                                        {renderItemChanges(edit.changes)}
                                        {renderAmountChanges(edit.changes)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Контейнер для кнопок */}
                <div className="mt-6 flex justify-between items-center no-print">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2 btn-dark text-white font-medium rounded-lg transition no-print flex items-center gap-2"
                    >
                        <FaArrowLeft /> Назад
                    </button>

                    <div className="flex gap-2">
                        {order.status === "В обробці" || order.status === "Нове замовлення" && (
                            <NavLink
                                to={`/admin_panel/edit-order/${order._id}`}
                                className="px-5 py-2 font-medium bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition no-print flex items-center gap-2"
                                title="Редагувати замовлення"
                            >
                                <FaEdit /> Редагувати
                            </NavLink>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="px-5 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                        >
                            <FaPrint /> Друк
                        </button>
                    </div>
                </div>

                {/* Додатковий текст для чеку */}
                <div className="hidden print:block text-center text-xs mt-4">
                    <p>Дякуємо за покупку!</p>
                    <p>Чек №{order.orderNumber}</p>
                    <p>{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString()}</p>
                </div>
            </div>
            {/* Модальне вікно скасування */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Скасування замовлення</h3>
                        <p className="mb-2">Оберіть причину скасування:</p>

                        <select
                            value={cancelReason}
                            onChange={(e) => {
                                setCancelReason(e.target.value);
                                if (!e.target.value.includes("Інша причина")) {
                                    setCancelComment("");
                                }
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                        >
                            <option value="">-- Оберіть причину --</option>
                            {cancellationReasons.map((reason, index) => (
                                <option key={index} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>

                        {cancelReason.includes("Інша причина") && (
                            <textarea
                                value={cancelComment}
                                onChange={(e) => setCancelComment(e.target.value)}
                                placeholder="Вкажіть детальну причину..."
                                className="w-full p-3 border border-gray-300 rounded-lg mb-4 h-32"
                                required
                            />
                        )}

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setIsCancelModalOpen(false);
                                    setCancelReason("");
                                    setCancelComment("");
                                }}
                                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={() => {
                                    let reasonToSend = cancelReason;
                                    if (cancelReason.includes("Інша причина") && cancelComment) {
                                        reasonToSend = cancelComment;
                                    }
                                    cancelOrder(reasonToSend);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                disabled={!cancelReason || (cancelReason.includes("Інша причина") && !cancelComment) || isCanceling}
                            >
                                {isCanceling ? "Обробка..." : "Підтвердити скасування"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default OrderDetails;
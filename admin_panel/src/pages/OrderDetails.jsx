import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

const OrderDetails = () => {
    const url = "http://localhost:4000";
    const { id } = useParams(); // Отримуємо ID замовлення з URL
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // Функція для отримання даних замовлення
    const fetchOrderDetails = async () => {
        try {
            const response = await axios.get(`${url}/api/order/details/${id}`);
            if (response.data.success) {
                setOrder(response.data.data);
            } else {
                toast.error("Помилка завантаження даних замовлення");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані замовлення");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

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

    // Функція для розрахунку загальної суми без знижок (тільки активні товари)
    const calculateTotalWithoutDiscount = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => total + item.price * item.quantity, 0);
    };

    // Функція для розрахунку загальної суми знижок (тільки активні товари)
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

    // Функція для розрахунку загальної суми з урахуванням знижок (тільки активні товари)
    const calculateTotalWithDiscount = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                if (item.discount) {
                    return total + (item.price * item.quantity * (100 - item.discount)) / 100;
                }
                return total + item.price * item.quantity;
            }, 0);
    };

    if (loading) {
        return <div className="p-10 w-full bg-primary/20 pl-[16%]">Завантаження...</div>;
    }

    if (!order) {
        return <div className="p-10 w-full bg-primary/20 pl-[16%]">Замовлення не знайдено</div>;
    }

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

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Деталі замовлення</h4>

                {/* Основна інформація про замовлення */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="medium-16 text-black"><strong>Дата замовлення:</strong> {new Date(order.date).toLocaleDateString()}</p>
                            <p className="medium-16 text-black"><strong>Номер замовлення:</strong> {order.orderNumber}</p>
                            <p className="medium-16 text-black"><strong>Стан замовлення:</strong> {order.status}</p>
                            {order.status === "Скасовано" && order.cancellationReason && (
                                <p className="medium-16 text-black"><strong>Причина скасування:</strong> {order.cancellationReason}</p>
                            )}
                        </div>
                        <div>
                            <p className="medium-16 text-black"><strong>Дані замовника:</strong> {order.deliveryDetails.secondName} {order.deliveryDetails.firstName} {order.deliveryDetails.middleName}</p>
                            <p className="medium-16 text-black"><strong>Телефон:</strong> {order.deliveryDetails.phone}</p>
                            <p className="medium-16 text-black"><strong>Email:</strong> {order.deliveryDetails.email}</p>
                            <p className="medium-16 text-black"><strong>Спосіб доставки:</strong> {order.deliveryMethod}</p>
                            <p className="medium-16 text-black"><strong>Адреса доставки:</strong> {renderDeliveryAddress(order)}</p>
                            {order.deliveryMethod === "Нова Пошта" && (
                                <p className="medium-16 text-black"><strong>Відділення:</strong> {order.deliveryDetails.departmentNumber}</p>
                            )}
                            <p className="medium-16 text-black"><strong>Оплата:</strong> {order.payment ? "Оплачено" : "Оплата під час доставки"}</p>
                        </div>
                    </div>
                </div>

                {/* Таблиця з товарами */}
                <table className="w-full border-collapse border border-gray-200 mb-6">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 border">Зображення</th>
                            <th className="p-3 border">Назва</th>
                            <th className="p-3 border">Розмір</th>
                            <th className="p-3 border">Ціна</th>
                            <th className="p-3 border">Кількість</th>
                            <th className="p-3 border">Сума</th>
                            <th className="p-3 border">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr
                                key={index}
                                className={item.removed ? "bg-gray-100 text-gray-500" : ""}
                            >
                                <td className="p-3 border flex justify-center items-center">
                                    <img
                                        src={`${url}/images/${item.image}`}
                                        alt="product"
                                        className={`h-24 object-cover shadow-sm ${item.removed ? "opacity-50" : ""}`}
                                    />
                                </td>
                                <td className={`p-3 border ${item.removed ? "line-through" : ""}`}>
                                    {item.name}
                                </td>
                                <td className={`p-3 border text-center ${item.removed ? "line-through" : ""}`}>
                                    {item.size}
                                </td>
                                <td className="p-3 border text-center">
                                    {item.discount ? (
                                        <>
                                            <span className={`${item.removed ? "line-through text-gray-500" : ""}`}>
                                                {item.price} грн
                                            </span>
                                            <br />
                                            {!item.removed && (
                                                <span className="text-red-600 font-bold">
                                                    {(item.price * (100 - item.discount) / 100).toFixed(2)} грн
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className={item.removed ? "line-through text-gray-500" : ""}>
                                            {item.price} грн
                                        </span>
                                    )}
                                </td>
                                <td className={`p-3 border text-center ${item.removed ? "line-through" : ""}`}>
                                    {item.quantity}
                                </td>
                                <td className="p-3 border text-center">
                                    {item.discount ? (
                                        <>
                                            <span className={`${item.removed ? "line-through text-gray-500" : ""}`}>
                                                {(item.price * item.quantity).toFixed(2)} грн
                                            </span>
                                            <br />
                                            {!item.removed && (
                                                <span className="text-red-600 font-bold">
                                                    {(item.price * item.quantity * (100 - item.discount) / 100).toFixed(2)} грн
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className={item.removed ? "line-through text-gray-500" : ""}>
                                            {(item.price * item.quantity).toFixed(2)} грн
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 border text-center">
                                    {item.removed ? (
                                        <span className="text-red-600 font-bold">Видалено</span>
                                    ) : (
                                        <span className="text-green-600 font-bold">Активний</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Підсумки */}
                <div className="mb-6">
                    <p className="medium-16 text-black"><strong>Загальна сума без знижок:</strong> {calculateTotalWithoutDiscount(order.items).toFixed(2)} грн</p>
                    <p className="medium-16 text-black"><strong>Знижки:</strong> {calculateTotalDiscount(order.items).toFixed(2)} грн</p>
                    <p className="medium-16 text-black"><strong>Загальна сума:</strong> {calculateTotalWithDiscount(order.items).toFixed(2)} грн</p>
                </div>

                {/* Кнопка "Назад" */}
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition"
                >
                    Назад
                </button>
            </div>
        </section>
    );
};

export default OrderDetails;
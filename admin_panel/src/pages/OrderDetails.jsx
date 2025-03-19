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

    // Функція для розрахунку загальної суми без знижок
    const calculateTotalWithoutDiscount = (items) => {
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    // Функція для розрахунку загальної суми знижок
    const calculateTotalDiscount = (items) => {
        return items.reduce((total, item) => {
            if (item.discount) {
                return total + (item.price * item.quantity * item.discount) / 100;
            }
            return total;
        }, 0);
    };

    // Функція для розрахунку загальної суми з урахуванням знижок
    const calculateTotalWithDiscount = (items) => {
        return items.reduce((total, item) => {
            if (item.discount) {
                return total + (item.price * item.quantity * (100 - item.discount)) / 100;
            }
            return total + item.price * item.quantity;
        }, 0);
    };

    if (loading) {
        return <div>Завантаження...</div>;
    }

    if (!order) {
        return <div>Замовлення не знайдено</div>;
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
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Деталі замовлення</h4>

                {/* Основна інформація про замовлення */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="medium-16 text-black"><strong>Дата замовлення:</strong> {new Date(order.date).toLocaleDateString()}</p>
                            <p className="medium-16 text-black"><strong>Номер замовлення:</strong> {order.orderNumber}</p>
                            <p className="medium-16 text-black"><strong>Стан замовлення:</strong> {order.status}</p>
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
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-3 border flex justify-center items-center">
                                    <img
                                        src={`${url}/images/${item.image}`}
                                        alt="product"
                                        className="height: 100% w-24 object-cover shadow-sm"
                                    />
                                </td>
                                <td className="p-3 border">{item.name}</td>
                                <td className="p-3 border text-center">{item.size}</td>
                                <td className="p-3 border text-center">
                                    {item.discount ? (
                                        <>
                                            <span className="line-through text-gray-500">{item.price} грн</span>
                                            <br />
                                            <span className="text-red-600 font-bold">
                                                {(item.price * (100 - item.discount) / 100).toFixed(2)} грн
                                            </span>
                                        </>
                                    ) : (
                                        <span>{item.price} грн</span>
                                    )}
                                </td>
                                <td className="p-3 border text-center">{item.quantity}</td>
                                <td className="p-3 border text-center">
                                    {item.discount ? (
                                        <>
                                            <span className="line-through text-gray-500">
                                                {(item.price * item.quantity).toFixed(2)} грн
                                            </span>
                                            <br />
                                            <span className="text-red-600 font-bold">
                                                {(item.price * item.quantity * (100 - item.discount) / 100).toFixed(2)} грн
                                            </span>
                                        </>
                                    ) : (
                                        <span>{(item.price * item.quantity).toFixed(2)} грн</span>
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
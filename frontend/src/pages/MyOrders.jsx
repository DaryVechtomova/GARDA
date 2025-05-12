import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Додав useNavigate
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import Flower from "../assets/design/flower.png"; // Переконайся, що шлях правильний

// Іконки та стилі для статусів (залишаємо твої)
import { FaBoxOpen, FaShippingFast, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';

const getStatusStyle = (status) => {
    switch (status) {
        case "Нове замовлення": return "bg-blue-100 text-blue-800";
        case "Оплачено": return "bg-cyan-100 text-cyan-800";
        case "В обробці": return "bg-yellow-100 text-yellow-800";
        case "Передано в службу доставки": return "bg-purple-100 text-purple-800";
        case "Чекає на отримання": return "bg-orange-100 text-orange-800";
        case "Доставлено": return "bg-green-100 text-green-800";
        case "Скасовано": return "bg-red-100 text-red-800";
        case "Оплата не вдалася": return "bg-red-200 text-red-900";
        default: return "bg-gray-100 text-gray-800";
    }
};
const getStatusIcon = (status) => {
    switch (status) {
        case "Нове замовлення": return <FaHourglassHalf className="mr-1 inline" />;
        case "Оплачено": return <FaCheckCircle className="mr-1 inline text-cyan-700" />;
        case "В обробці": return <FaBoxOpen className="mr-1 inline" />;
        case "Передано в службу доставки": return <FaShippingFast className="mr-1 inline" />;
        case "Чекає на отримання": return <FaShippingFast className="mr-1 inline text-orange-700" />;
        case "Доставлено": return <FaCheckCircle className="mr-1 inline text-green-700" />;
        case "Скасовано": return <FaTimesCircle className="mr-1 inline text-red-700" />;
        case "Оплата не вдалася": return <FaTimesCircle className="mr-1 inline text-red-800" />;
        default: return null;
    }
};

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const context = useContext(ShopContext);
    const API_URL = context?.url;
    const navigate = useNavigate(); // Для кнопки "Перейти до каталогу"

    useEffect(() => {
        const fetchOrders = async () => {
            // ... (твій код fetchOrders залишається таким же)
            if (!API_URL) {
                toast.error("Помилка конфігурації: URL API не визначено.");
                setLoading(false);
                return;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                toast.info("Будь ласка, увійдіть, щоб переглянути ваші замовлення.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/api/order/userorders`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    setOrders(response.data.data);
                } else {
                    toast.error(response.data.message || "Не вдалося завантажити замовлення.");
                }
            } catch (error) {
                console.error("Error fetching user orders:", error);
                toast.error("Помилка при завантаженні замовлень. Спробуйте пізніше.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [API_URL]);

    if (loading) {
        return (
            <div className="min-h-screen pt-28 pb-16 flex justify-center items-center">
                <p className="text-xl text-gray-600">Завантаження ваших замовлень...</p>
            </div>
        );
    }

    if (!localStorage.getItem('token')) {
        return (
            <section className='min-h-screen pt-28 pb-16 font-["Literata"]'>
                <div className="max-w-[1440px] mx-auto px-4 md:px-8 xl:px-20 text-center py-20">
                    <p className="text-xl text-gray-700 mb-6">Будь ласка, <Link to="/login" className="text-[#54A5D9] hover:underline font-semibold">увійдіть</Link>, щоб переглянути історію замовлень.</p>
                </div>
            </section>
        );
    }

    if (orders.length === 0) {
        return (
            <section className='min-h-screen pt-28 pb-16 font-["Literata"]'>
                <div className="max-w-[1440px] mx-auto px-4 md:px-8 xl:px-20">
                    <div className="flex items-center justify-center mb-8 md:mb-12">
                        <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain mr-2 sm:mr-3 md:mr-4 transform translate-y-[10px]" />
                        <h2 style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }} className="text-xl sm:text-2xl md:text-3xl text-center text-black">
                            Мої замовлення
                        </h2>
                        <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain ml-2 sm:ml-3 md:ml-4 transform translate-y-[10px]" />
                    </div>
                    <div className="text-center py-10">
                        <p className="text-xl text-gray-600 mb-6">У вас ще немає замовлень.</p>
                        <button
                            onClick={() => navigate("/")} // Перенаправлення на головну (каталог)
                            className="bg-[#54A5D9] hover:bg-[#4389b9] text-white font-semibold py-3 px-8 rounded-lg transition-colors text-base"
                        >
                            Перейти до каталогу
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className='min-h-screen pt-28 pb-16 font-["Literata"]'>
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 xl:px-20">
                {/* Заголовок сторінки з квітками */}
                <div className="flex items-center justify-center mb-8 md:mb-12">
                    <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain mr-2 sm:mr-3 md:mr-4 transform translate-y-[10px]" />
                    <h2 style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }} className="text-xl sm:text-2xl md:text-3xl text-center text-black">
                        Мої замовлення
                    </h2>
                    <img src={Flower} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain ml-2 sm:ml-3 md:ml-4 transform translate-y-[10px]" />
                </div>

                {/* Список замовлень */}
                <div className="space-y-8"> {/* Збільшив відступ між картками */}
                    {orders.map((order) => (
                        <div key={order._id} className="bg-white shadow-xl rounded-[30px] p-4 sm:p-6 md:p-8 border border-gray-200/50">
                            {/* Хедер картки замовлення */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-300/70">
                                <div>
                                    <h3 style={{ fontFamily: "Montserrat Alternates" }} className="text-lg sm:text-xl font-semibold text-black">
                                        Замовлення № {order.orderNumber}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Дата: {new Date(order.date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className={`mt-3 sm:mt-0 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full ${getStatusStyle(order.status)} flex items-center`}>
                                    {getStatusIcon(order.status)}
                                    <span className="ml-1">{order.status}</span>
                                </div>
                            </div>

                            {/* Список товарів у замовленні */}
                            <div className="mb-4 space-y-3">
                                {order.items.filter(item => !item.removed).map(item => (
                                    <div key={`${item.productId}-${item.size}`} className="flex items-start sm:items-center py-3 border-b border-gray-200/60 last:border-b-0">
                                        <img
                                            src={item.image ? `${API_URL}/images/${item.image}` : "/placeholder.png"}
                                            alt={item.name}
                                            className="w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 object-cover rounded-lg border border-black/10 mr-4 flex-shrink-0"
                                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                                        />
                                        <div className="flex-grow">
                                            <p className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-1">{item.name}</p>
                                            <p className="text-xs sm:text-sm text-gray-600">Розмір: {item.size === "N/A" ? "Стандарт" : item.size}</p>
                                            <p className="text-xs sm:text-sm text-gray-600">
                                                {item.quantity} шт. x {item.price.toFixed(2)} грн
                                                {item.discount > 0 && <span className="text-red-600 ml-1 text-xs">(-{item.discount}%)</span>}
                                            </p>
                                        </div>
                                        <p className="text-sm sm:text-base font-semibold text-gray-800 ml-2 text-right flex-shrink-0 w-24 sm:w-28">
                                            {(item.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2)} грн
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Підсумок та інформація про оплату */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-4 border-t border-gray-300/70 mt-4">
                                <div className="text-sm text-gray-700">
                                    <p className="mb-1 text-base">
                                        <span className="font-semibold">Спосіб оплати:</span> {
                                            order.paymentMethod === 'payOnDelivery' ? 'При отриманні' :
                                                order.paymentMethod === 'payNow' ? 'Онлайн карткою' : order.paymentMethod || 'Не вказано'
                                        }
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0 text-right">
                                    <p className="text-sm text-gray-600">До сплати:</p>
                                    <p style={{ fontFamily: "Montserrat Alternates" }} className="text-lg sm:text-xl font-bold text-black">
                                        {order.amount.toFixed(2)} грн
                                    </p>
                                    {/* Опціонально: посилання на деталі замовлення (якщо буде така сторінка) */}
                                    {/* <Link to={`/my-orders/${order._id}`} className="text-sm text-[#54A5D9] hover:underline mt-1 inline-block font-medium">
                                        Детальніше
                                    </Link> */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MyOrders;
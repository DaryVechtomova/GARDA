import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Для посилань на деталі замовлення, якщо є
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext'; // Припускаю, що URL API тут
import Flower from "../assets/design/flower.png";

// Іконки для статусів (опціонально)
import { FaBoxOpen, FaShippingFast, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';

// Стилі для статусів (можна винести в окремий файл або хелпер)
const getStatusStyle = (status) => {
    switch (status) {
        case "Нове замовлення": return "bg-blue-100 text-blue-800";
        case "В обробці": return "bg-yellow-100 text-yellow-800";
        case "Передано в службу доставки": return "bg-purple-100 text-purple-800";
        case "Чекає на отримання": return "bg-orange-100 text-orange-800";
        case "Доставлено": return "bg-green-100 text-green-800";
        case "Скасовано": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
    }
};
const getStatusIcon = (status) => {
    switch (status) {
        case "Нове замовлення": return <FaHourglassHalf className="mr-1 inline" />;
        case "В обробці": return <FaBoxOpen className="mr-1 inline" />;
        case "Передано в службу доставки": return <FaShippingFast className="mr-1 inline" />;
        case "Чекає на отримання": return <FaShippingFast className="mr-1 inline text-orange-700" />;
        case "Доставлено": return <FaCheckCircle className="mr-1 inline text-green-700" />;
        case "Скасовано": return <FaTimesCircle className="mr-1 inline text-red-700" />;
        default: return null;
    }
};

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const context = useContext(ShopContext);
    const API_URL = context?.url; // Отримуємо API_URL з контексту

    useEffect(() => {
        const fetchOrders = async () => {
            if (!API_URL) {
                toast.error("Помилка конфігурації: URL API не визначено.");
                setLoading(false);
                return;
            }
            const token = localStorage.getItem('token'); // Або твій спосіб отримання токена
            if (!token) {
                // Можливо, перенаправити на логін або показати повідомлення
                toast.info("Будь ласка, увійдіть, щоб переглянути ваші замовлення.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Важливо: ендпоінт /api/order/userorders має бути захищений
                // і отримувати userId з токена на бекенді, а не з тіла запиту.
                // Якщо ти все ж передаєш userId в тілі, тобі потрібно його отримати з токена тут:
                // const decodedToken = jwtDecode(token); const userId = decodedToken._id;
                // const response = await axios.post(`${API_URL}/api/order/userorders`, { userId }, {
                //    headers: { Authorization: `Bearer ${token}` }
                // });

                // Кращий варіант, якщо бекенд бере userId з токена (наприклад, GET запит)
                // Або POST, але без userId в тілі, бекенд сам його дістане з req.user
                const response = await axios.get(`${API_URL}/api/order/userorders`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log(response.data);
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
    }, [API_URL]); // Залежність від API_URL

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-xl text-gray-600">Завантаження ваших замовлень...</p>
            </div>
        );
    }

    if (!localStorage.getItem('token')) { // Перевірка токена перед рендерингом списку
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-lg text-gray-700">Будь ласка, <Link to="/login" className="text-blue-600 hover:underline">увійдіть</Link>, щоб переглянути історію замовлень.</p>
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-semibold text-gray-800 mb-6">Мої замовлення</h1>
                <p className="text-lg text-gray-600">У вас ще немає замовлень.</p>
                <Link to="/" className="mt-4 inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Перейти до каталогу
                </Link>
            </div>
        );
    }

    return (
        <div className="max-padd-container py-28 xl:py-32">
            <div className="flex items-center justify-center mb-6 md:mb-10">
                <img
                    src={Flower}
                    alt=""
                    className="
                        h-12 w-12
                        sm:h-14 sm:w-14
                        md:h-16 md:w-16
                        object-contain
                        mr-2 sm:mr-3 md:mr-4
                        transform translate-y-[10px]  {/* АБО translate-y-2.5 якщо ви налаштували такі кроки */}
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
                    Мої замовлення
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
            <div className="space-y-6">
                {orders.map((order) => (
                    <div key={order._id} className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-700">
                                    Замовлення № {order.orderNumber}
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-500">
                                    Дата: {new Date(order.date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                            </div>
                            <div className={`mt-2 sm:mt-0 px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${getStatusStyle(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                            </div>
                        </div>

                        <div className="mb-4">
                            {order.items.filter(item => !item.removed).map(item => (
                                <div key={item.productId + item.size} className="flex items-center py-2 border-b border-gray-100 last:border-b-0">
                                    <img
                                        src={`${API_URL}/images/${item.image}`}
                                        alt={item.name}
                                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md mr-3 sm:mr-4"
                                        onError={(e) => { e.target.src = '/placeholder.png'; }} // Заглушка
                                    />
                                    <div className="flex-grow">
                                        <p className="text-sm sm:text-base font-medium text-gray-800">{item.name}</p>
                                        <p className="text-xs sm:text-sm text-gray-500">Розмір: {item.size}</p>
                                        <p className="text-xs sm:text-sm text-gray-500">
                                            {item.quantity} шт. x {item.price.toFixed(2)} грн
                                            {item.discount > 0 && <span className="text-red-500 ml-1">(-{item.discount}%)</span>}
                                        </p>
                                    </div>
                                    <p className="text-sm sm:text-base font-semibold text-gray-800 ml-2">
                                        {(item.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2)} грн
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">Спосіб оплати:</span> {
                                        order.paymentMethod === 'payOnDelivery' ? 'Оплата при отриманні' :
                                            order.paymentMethod === 'payNow' ? 'Онлайн оплата' : order.paymentMethod
                                    }
                                </p>
                            </div>
                            <div className="mt-3 sm:mt-0 text-right">
                                <p className="text-sm text-gray-600">Всього:</p>
                                <p className="text-lg sm:text-xl font-bold text-gray-800">{order.amount.toFixed(2)} грн</p>
                                {/* Можна додати посилання на деталі замовлення, якщо така сторінка є */}
                                {/* <Link to={`/order-details/${order._id}`} className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                                    Детальніше
                                </Link> */}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyOrders;
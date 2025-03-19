import React, { useEffect, useState } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa6';
import { NavLink } from 'react-router-dom';

function Orders() {
    const url = "http://localhost:4000";
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("asc");
    const [dateFrom, setDateFrom] = useState(""); // Початкова дата для фільтрації
    const [dateTo, setDateTo] = useState(""); // Кінцева дата для фільтрації

    const fetchAllOrders = async () => {
        try {
            const response = await axios.get(url + "/api/order/list");
            if (response.data.success) {
                if (response.data.data.length === 0) {
                    toast.info("Замовлень ще немає");
                    setOrders([]);
                } else {
                    setOrders(response.data.data);
                    setFilteredOrders(response.data.data);
                }
            } else {
                toast.error("Помилка при отриманні замовлень");
            }
        } catch (error) {
            toast.error("Сталася помилка при завантаженні замовлень");
            console.error("Помилка:", error);
        }
    };

    useEffect(() => {
        fetchAllOrders();
    }, []);

    // Функція для форматування дати
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Функція для фільтрації замовлень
    useEffect(() => {
        let filtered = orders;

        // Фільтрація за статусом
        if (statusFilter !== "all") {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Пошук за номером замовлення
        if (searchQuery) {
            filtered = filtered.filter(order =>
                order.orderNumber.toString().includes(searchQuery)
            );
        }

        // Фільтрація за діапазоном дат
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filtered = filtered.filter(order => new Date(order.date) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            filtered = filtered.filter(order => new Date(order.date) <= toDate);
        }

        // Сортування за датою
        filtered = [...filtered].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });

        setFilteredOrders(filtered);
    }, [orders, statusFilter, searchQuery, sortOrder, dateFrom, dateTo]);

    // Функція для оновлення статусу замовлення
    const updateOrderStatus = async (orderId) => {
        try {
            // Отримуємо поточний статус замовлення
            const order = orders.find((order) => order._id === orderId);
            if (!order) {
                toast.error("Замовлення не знайдено");
                return;
            }

            // Визначаємо наступний статус
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

            // Відправляємо PUT-запит з новим статусом
            const response = await axios.put(`${url}/api/order/update-status/${orderId}`, {
                status: nextStatus, // Передаємо новий статус
            });

            if (response.data.success) {
                toast.success("Статус замовлення оновлено");
                fetchAllOrders(); // Оновити список замовлень
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Не вдалося оновити статус");
            console.error("Помилка:", error);
        }
    };

    // Функція для відображення адреси доставки в залежності від способу доставки
    const renderDeliveryAddress = (order) => {
        const { deliveryMethod, deliveryDetails } = order;

        switch (deliveryMethod) {
            case "Нова Пошта":
                return (
                    <>
                        <p className="medium-16 text-black">
                            {deliveryDetails.region}, {deliveryDetails.city}
                        </p>
                        <p className="medium-16 text-black">
                            Відділення/поштомат: {deliveryDetails.departmentNumber}
                        </p>
                    </>
                );
            case "Укрпошта":
                return (
                    <>
                        <p className="medium-16 text-black">
                            {deliveryDetails.region}, {deliveryDetails.city}
                        </p>
                        <p className="medium-16 text-black">
                            {deliveryDetails.street}, {deliveryDetails.houseNumber}
                        </p>
                        <p className="medium-16 text-black">
                            Поштовий індекс: {deliveryDetails.postalCode}
                        </p>
                    </>
                );
            case "Самовивіз":
                return (
                    <p className="medium-16 text-black">
                        Самовивіз з магазину у м. {deliveryDetails.city}
                    </p>
                );
            default:
                return <p className="medium-16 text-black">Невідомий спосіб доставки</p>;
        }
    };

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список замовлень</h4>

                {/* Елементи управління: пошук, фільтр, сортування */}
                <div className="flex gap-4 mb-4 flex-wrap">
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        Сортувати за датою {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="all">Всі статуси</option>
                        <option value="Нове замовлення">Нове замовлення</option>
                        <option value="В обробці">В обробці</option>
                        <option value="Передано в службу доставки">Передано в службу доставки</option>
                        <option value="Чекає на отримання">Чекає на отримання</option>
                        <option value="Доставлено">Доставлено</option>
                        <option value="Скасовано">Скасовано</option>
                        <option value="Повернення">Повернення</option>
                    </select>
                    <input
                        type="date"
                        placeholder="Дата від"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />
                    <input
                        type="date"
                        placeholder="Дата до"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />
                    <input
                        type="text"
                        placeholder="Пошук за номером замовлення"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />

                </div>

                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className='p-3 border'>Замовлення</th>
                            <th className='p-3 border'>Товари</th>
                            <th className='p-3 border'>Замовник</th>
                            <th className='p-3 border'>Адреса доставки</th>
                            <th className='p-3 border'>Сума</th>
                            <th className='p-3 border'>Статус оплати</th>
                            <th className='p-3 border'>Дата</th>
                            <th className='p-3 border'>Статус замовлення</th>
                            <th className='p-3 border'>Деталі</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order, i) => (
                            <tr key={i} className="border-b border-gray-200">
                                <td className="p-3 border">
                                    <div className="flex items-center gap-2">
                                        <span className="medium-16">№{order.orderNumber}</span>
                                    </div>
                                </td>
                                <td className="p-3 border">
                                    <ul>
                                        {order.items.map((item, index) => (
                                            <li key={index} className="medium-16">
                                                {item.name} (Розмір: {item.size}) x {item.quantity}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="p-3 border">
                                    <p className="medium-16 text-black">
                                        {order.deliveryDetails.secondName} {order.deliveryDetails.firstName} {order.deliveryDetails.middleName}
                                    </p>
                                    <p className="medium-16 text-black">
                                        {order.deliveryDetails.phone}
                                    </p>
                                    <p className="medium-16 text-black">
                                        {order.deliveryDetails.email}
                                    </p>
                                </td>
                                <td className="p-3 border">
                                    {renderDeliveryAddress(order)}
                                </td>
                                <td className="p-3 border text-center">
                                    <span className="medium-16">{order.amount} грн</span>
                                </td>
                                <td className="p-3 border text-center">
                                    <span className="medium-16">
                                        {order.payment ? "Оплачено" : "Не оплачено"}
                                    </span>
                                </td>
                                <td className="p-3 border text-center">
                                    <span className="medium-16">
                                        {formatDate(order.date)}
                                    </span>
                                </td>
                                <td className="p-3 border text-center">
                                    <span className="flexCenter gap-x-2">
                                        <b className="medium-16">{order.status}</b>
                                    </span>
                                    {order.status !== "Скасовано" && order.status !== "Повернення" && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id)}
                                            className="px-2 py-1 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition text-sm"
                                        >
                                            Оновити
                                        </button>
                                    )}
                                </td>
                                <td className="p-3 border text-center items-center">
                                    <NavLink to={`/order/details/${order._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <FaPlus />
                                    </NavLink>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default Orders;
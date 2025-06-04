import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaTimes, FaEdit } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import Flower from "../assets/design/flower.png";

function Orders() {
  const url = "http://localhost:4000";
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [dateFrom, setDateFrom] = useState(""); // Початкова дата для фільтрації
  const [dateTo, setDateTo] = useState(""); // Кінцева дата для фільтрації

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelComment, setCancelComment] = useState("");

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
    "Інша причина (вказати у коментарі)",
  ];

  const fetchAllOrders = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      window.location.href = FRONTEND_LOGIN_URL;
      return;
    }
    try {
      const response = await axios.get(url + "/api/order/list");
      if (response.data.success) {
        if (response.data.data.length === 0) {
          toast.info("Замовлень ще немає");
          setOrders([]);
        } else {
          const sortedOrders = response.data.data.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
          });
          setOrders(sortedOrders);
          setFilteredOrders(sortedOrders);
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
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Пошук за номером замовлення
    if (searchQuery) {
      filtered = filtered.filter((order) =>
        order.orderNumber.toString().includes(searchQuery)
      );
    }

    // Фільтрація за діапазоном дат
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((order) => new Date(order.date) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      filtered = filtered.filter((order) => new Date(order.date) <= toDate);
    }

    // Сортування за датою
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "DESC" ? dateA - dateB : dateB - dateA;
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
      const response = await axios.put(
        `${url}/api/order/update-status/${orderId}`,
        {
          status: nextStatus, // Передаємо новий статус
        }
      );

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
        return (
          <p className="medium-16 text-black">Невідомий спосіб доставки</p>
        );
    }
  };
  const cancelOrder = async () => {
    let reasonToSend = cancelReason;

    if (cancelReason.includes("Інша причина") && cancelComment) {
      reasonToSend = cancelComment; // Відправляємо тільки коментар, без префікса
    }

    if (!reasonToSend.trim()) {
      toast.error("Будь ласка, оберіть причину скасування");
      return;
    }

    setIsCanceling(true);
    try {
      const response = await axios.put(
        `${url}/api/order/cancel/${selectedOrderId}`,
        {
          reason: reasonToSend,
        }
      );

      if (response.data.success) {
        toast.success("Замовлення успішно скасовано");
        fetchAllOrders();
        setIsCancelModalOpen(false);
        setCancelReason("");
        setCancelComment("");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Не вдалося скасувати замовлення");
      console.error("Помилка:", error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <section className="p-10 w-full bg-primary/20">
      <div className="px-4">
        <div className="flex items-center mb-4">
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
            Список замовлень
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
        {/* <h4 className="bold-22 pb-2 uppercase">Список замовлень</h4> */}

        {/* Елементи управління: пошук, фільтр, сортування */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
          >
            Сортувати за датою {sortOrder === "asc" ? "↑" : "↓"}
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
          >
            <option value="all">Всі статуси</option>
            <option value="Нове замовлення">Нове замовлення</option>
            <option value="В обробці">В обробці</option>
            <option value="Запаковане">Запаковане</option>
            <option value="Передано в службу доставки">
              Передано в службу доставки
            </option>
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
        <div className="overflow-auto max-h-[calc(100vh-238px)]">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-3 border">Замовлення</th>
                <th className="p-3 border">Товари</th>
                <th className="p-3 border">Замовник</th>
                <th className="p-3 border">Адреса доставки</th>
                <th className="p-3 border">Сума</th>
                <th className="p-3 border">Дата</th>
                <th className="p-3 border">Статус замовлення</th>
                <th className="p-3 border">Деталі</th>
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
                      {order.items
                        .filter((item) => !item.removed) // Фільтруємо тільки невидалені товари
                        .map((item, index) => (
                          <li key={index} className="medium-16">
                            {item.name} (Розмір: {item.size}) x {item.quantity}
                          </li>
                        ))}
                    </ul>
                  </td>
                  <td className="p-3 border">
                    <p className="medium-16 text-black">
                      {order.deliveryDetails.secondName}{" "}
                      {order.deliveryDetails.firstName}{" "}
                      {order.deliveryDetails.middleName}
                    </p>
                    <p className="medium-16 text-black">
                      {order.deliveryDetails.phone}
                    </p>
                    <p className="medium-16 text-black">
                      {order.deliveryDetails.email}
                    </p>
                  </td>
                  <td className="p-3 border">{renderDeliveryAddress(order)}</td>
                  <td className="p-3 border text-center">
                    <span className="medium-16">{order.amount} грн</span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className="medium-16">{formatDate(order.date)}</span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className="flexCenter gap-x-2">
                      <b className="medium-16">{order.status}</b>
                    </span>
                    <div className="flex gap-2 justify-center mt-2">
                      {(order.status === "Нове замовлення" ||
                        order.status === "В обробці") && (
                        <button
                          onClick={() => {
                            setSelectedOrderId(order._id);
                            setIsCancelModalOpen(true);
                          }}
                          className="px-2 py-1 bg-[#99120d] text-white font-bold rounded-lg shadow-md hover:bg-[#7a0e0a] transition text-sm"
                          title="Скасувати замовлення"
                        >
                          <FaTimes />
                        </button>
                      )}
                      {order.status !== "Скасовано" &&
                        order.status !== "Повернення" &&
                        order.status !== "Доставлено" && (
                          <button
                            onClick={() => updateOrderStatus(order._id)}
                            className="px-2 py-1 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition text-sm"
                            title="Оновити статус"
                          >
                            Оновити
                          </button>
                        )}
                    </div>
                  </td>
                  <td className="p-3 border text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <NavLink
                        to={`/admin_panel/order/details/${order._id}`}
                        className="text-blue-500 hover:text-blue-700"
                        title="Деталі"
                      >
                        <FaPlus />
                      </NavLink>
                      {order.status === "В обробці" ||
                      order.status === "Нове замовлення" ? (
                        <NavLink
                          to={`/admin_panel/edit-order/${order._id}`}
                          className="text-[#077014] hover:text-[#077014]"
                          title="Редагувати"
                        >
                          <FaEdit />
                        </NavLink>
                      ) : (
                        <button
                          className="text-gray-400 cursor-not-allowed"
                          title="Редагування доступне тільки для замовлень у статусі 'В обробці'"
                          disabled
                        >
                          <FaEdit />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
                disabled={isCanceling}
              >
                Скасувати
              </button>
              <button
                onClick={cancelOrder}
                className="px-4 py-2 bg-[#99120d] text-white rounded-lg hover:bg-[#7a0e0a]"
                disabled={
                  isCanceling ||
                  !cancelReason ||
                  (cancelReason.includes("Інша причина") && !cancelComment)
                }
              >
                {isCanceling ? "Скасування..." : "Підтвердити"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Orders;

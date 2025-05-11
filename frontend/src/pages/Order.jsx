import React, { useContext, useEffect, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Flower from "../assets/design/flower.png";

const Order = () => {
  const navigate = useNavigate();
  const {
    getTotalCartAmount,
    getTotalCartAmount_WithoutDiscount,
    token,
    all_products,
    cartItems,
    userProfileData,
    url,
  } = useContext(ShopContext);

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    comment: "",
    deliveryMethod: "", // Спосіб доставки
    region: "", // Область
    city: "", // Місто
    postalCode: "", // Поштовий індекс
    street: "", // Вулиця
    houseNumber: "", // Номер будинку
    departmentNumber: "", // Номер відділення/поштомату
  });

  const [errors, setErrors] = useState({});

  const onChangeHandler = (e) => {
    const { name, value } = e.target; // Виправлено тут
    setData((prevData) => ({ ...prevData, [name]: value }));

    // Якщо змінюється спосіб доставки, скидаємо відповідні поля
    if (name === "deliveryMethod") {
      setData((prevData) => ({
        ...prevData,
        region: "",
        city: "",
        postalCode: "",
        street: "",
        houseNumber: "",
        departmentNumber: "",
      }));
      setErrors({}); // Скидаємо помилки
    }
  };

  // useEffect(() => {
  //     console.log(data)
  // }, [data])

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля.");
      return;
    }

    // Order.jsx
    let orderItems = [];
    // ІТЕРАЦІЯ ПО КЛЮЧАХ cartItems (які є "itemId-size")
    Object.keys(cartItems).forEach((cartKey) => {
      const cartItemData = cartItems[cartKey]; // Отримуємо { itemId, size, quantity }

      if (cartItemData && cartItemData.quantity > 0) {
        // Знаходимо відповідний продукт в all_products за cartItemData.itemId
        const productInfo = all_products.find(p => p._id === cartItemData.itemId);

        if (productInfo) {
          let itemInfo = {
            _id: productInfo._id,       // ID продукту
            name: productInfo.name,
            price: productInfo.price,    // Ціна без знижки
            discount: productInfo.discount || 0, // Передаємо знижку
            quantity: cartItemData.quantity,    // Кількість з кошика
            // Переконайся, що productInfo.images існує і є масивом
            image: (productInfo.images && productInfo.images.length > 0) ? productInfo.images[0] : 'placeholder.jpg', // Головне зображення
            size: cartItemData.size          // Розмір з кошика
          };
          orderItems.push(itemInfo);
        } else {
          console.warn(`Продукт з ID ${cartItemData.itemId} для запису кошика ${cartKey} не знайдено в all_products.`);
        }
      }
    });

    let orderData = {
      userId: token, // Використовуємо токен як ID користувача
      items: orderItems,
      amount: getTotalCartAmount(),
      deliveryMethod: data.deliveryMethod,
      deliveryDetails: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        phone: data.phone,
        region: data.region,
        city: data.city,
        postalCode: data.postalCode,
        street: data.street,
        houseNumber: data.houseNumber,
        departmentNumber: data.departmentNumber,
      },
    };

    try {
      let response = await axios.post(url + "/api/order/place", orderData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        const { session_url } = response.data;
        if (response.data.success) {
          const { session_url, orderNumber: receivedOrderNumber } = response.data; // Отримуємо orderNumber з відповіді
          toast.success(`Ваше замовлення №${receivedOrderNumber} успішно оформлено!`); // Використовуємо отриманий номер
          window.location.replace(session_url);
        }
        window.location.replace(session_url);
      } else {
        toast.error("Помилка при оформленні замовлення");
      }
    } catch (error) {
      toast.error("Сталася помилка при відправці даних");
      console.error("Помилка при відправці запиту на створення замовлення:", error); // Повний об'єкт помилки Axios
      if (error.response) {
        // Запит був зроблений, і сервер відповів статусом, що не входить в діапазон 2xx
        console.error("Дані помилки від сервера:", error.response.data);
        console.error("Статус помилки від сервера:", error.response.status);
        toast.error(error.response.data.message || "Помилка валідації даних на сервері.");
      } else if (error.request) {
        // Запит був зроблений, але відповідь не отримана
        console.error("Запит відправлено, але відповідь не отримана:", error.request);
        toast.error("Не вдалося зв'язатися з сервером.");
      } else {
        // Щось сталося при налаштуванні запиту, що викликало помилку
        console.error("Помилка налаштування запиту:", error.message);
        toast.error("Помилка при підготовці запиту.");
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Перевірка для Нової Пошти
    if (data.deliveryMethod === "Нова Пошта") {
      if (!data.region) newErrors.region = "Вкажіть область";
      if (!data.city) newErrors.city = "Вкажіть місто";
      if (!data.departmentNumber)
        newErrors.departmentNumber = "Вкажіть номер відділення або поштомату";
    }

    // Перевірка для Укрпошти
    if (data.deliveryMethod === "Укрпошта") {
      if (!data.region) newErrors.region = "Вкажіть область";
      if (!data.city) newErrors.city = "Вкажіть місто";
      if (!data.postalCode) newErrors.postalCode = "Вкажіть поштовий індекс";
      if (!data.street) newErrors.street = "Вкажіть вулицю";
      if (!data.houseNumber) newErrors.houseNumber = "Вкажіть номер будинку";
    }

    // Перевірка для Самовивозу
    if (data.deliveryMethod === "Самовивіз") {
      if (!["Київ", "Львів", "Харків"].includes(data.city)) {
        newErrors.city =
          "Самовивіз доступний тільки у Києві, Львові або Харкові";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Повертає true, якщо помилок немає
  };
   // Функція для очищення номера телефону від форматування
  const sanitizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "";
    // Видаляємо всі символи, крім цифр та знаку "+" на початку
    return phoneNumber.replace(/[^\d+]/g, ""); 
    // Або, якщо ти точно знаєш, що завжди буде "+38" і потім цифри, можна так:
    // return "+" + phoneNumber.replace(/\D/g, "").slice(2); // Видаляє все, крім цифр, і бере з 3-го символу (після "38")
    // Або ще простіше, якщо формат з профілю завжди "+38 (XXX) XXX-XX-XX":
    // return phoneNumber.replace(/[()\s-]/g, ""); // Видаляє тільки дужки, пробіли, дефіси
  };
    // useEffect для автозаповнення форми даними з профілю, КОЛИ userProfileData завантажиться
  useEffect(() => {
    if (userProfileData) {
   // Очищаємо номер телефону перед встановленням у стан
      const rawPhoneNumber = userProfileData.phoneNumber ? sanitizePhoneNumber(userProfileData.phoneNumber) : "";

      setData((prevData) => ({
        ...prevData, // Зберігаємо вже введені дані (наприклад, comment або обраний deliveryMethod)
        firstName: userProfileData.firstName || prevData.firstName || "",
        lastName: userProfileData.secondName || prevData.lastName || "", // У профілі secondName
        middleName: userProfileData.middleName || prevData.middleName || "", // Якщо є в профілі
        email: userProfileData.email || prevData.email || "",
        phone: rawPhoneNumber || prevData.phone || "", // Використовуємо очищений номер // У профілі phoneNumber
        // Поля адреси (якщо вони є в userProfileData і ти хочеш їх автозаповнювати)
        region: userProfileData.region || prevData.region || "",
        city: userProfileData.city || prevData.city || "",
        postalCode: userProfileData.postalCode || prevData.postalCode || "",
        street: userProfileData.street || prevData.street || "",
        houseNumber: userProfileData.houseNumber || prevData.houseNumber || "",
        // departmentNumber зазвичай не зберігається в профілі, а обирається для конкретного замовлення
      }));
    }
  }, [userProfileData]); // Залежність від userProfileData

  useEffect(() => {
    if (!token) {
      toast.error("Будь ласка, авторизуйтеся, щоб оформити замовлення.");
      navigate("/cart");
    } else if (getTotalCartAmount() === 0) {
      toast.error(
        "Ваш кошик порожній. Додайте товари для оформлення замовлення."
      );
      navigate("/cart");
    }
  }, [token]);

  const totalAmount = getTotalCartAmount();
  const displayPreliminarySum = getTotalCartAmount_WithoutDiscount();

  return (
    <section className="max-padd-container py-28 xl:py-32">
      <form
        onSubmit={placeOrder}
        className="flex flex-col xl:flex-row gap-20 xl:gap-28"
      >
        {/*delivery information*/}
        <div className="flex flex-1 flex-col gap-3 text-[95%]">
          {/* Додаємо relative сюди, якщо координати відносно цього блоку */}
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
              Інформація про доставку
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

          <div className="flex gap-3">
            <input
              onChange={onChangeHandler}
              value={data.firstName}
              type="text"
              name="firstName"
              placeholder="Ім'я"
              className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2"
            />
            <input
              onChange={onChangeHandler}
              value={data.lastName}
              type="text"
              name="lastName"
              placeholder="Призвіще"
              className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2"
            />
            <input
              onChange={onChangeHandler}
              value={data.middleName} // <--- ДОДАЙ ЦЕ
              type="text"
              name="middleName"      // <--- ДОДАЙ ЦЕ
              placeholder="По-батькові" // Познач як необов'язкове, якщо це так
              className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2" // Можеш змінити w-1/2, якщо треба
            />
          </div>
          <input
            onChange={onChangeHandler}
            value={data.email}
            type="email"
            name="email"
            placeholder="Email"
            className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2"
          />
          <input
            onChange={onChangeHandler}
            value={data.phone}
            type="text"
            name="phone"
            placeholder="Номер телефону"
            className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2"
          />
          <textarea
            onChange={onChangeHandler}
            value={data.comment}
            name="comment"
            placeholder="Коментар до замовлення (необов'язково)"
            className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
            rows="4"
          />
          {/* Спосіб доставки */}
          <select
            onChange={onChangeHandler}
            value={data.deliveryMethod}
            name="deliveryMethod"
            className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
          >
            <option value="">Оберіть спосіб доставки</option>
            <option value="Нова Пошта">Нова Пошта</option>
            <option value="Укрпошта">Укрпошта</option>
            <option value="Самовивіз">Самовивіз</option>
          </select>

          {/* Поля для Нової Пошти */}
          {data.deliveryMethod === "Нова Пошта" && (
            <>
              <input
                onChange={onChangeHandler}
                value={data.region}
                type="text"
                name="region"
                placeholder="Область"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.city}
                type="text"
                name="city"
                placeholder="Місто"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.departmentNumber}
                type="text"
                name="departmentNumber"
                placeholder="Номер відділення або поштомату"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              {errors.departmentNumber && (
                <p className="text-red-500">{errors.departmentNumber}</p>
              )}
            </>
          )}

          {/* Поля для Укрпошти */}
          {data.deliveryMethod === "Укрпошта" && (
            <>
              <input
                onChange={onChangeHandler}
                value={data.region}
                type="text"
                name="region"
                placeholder="Область"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.city}
                type="text"
                name="city"
                placeholder="Місто"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.postalCode}
                type="text"
                name="postalCode"
                placeholder="Поштовий індекс"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.street}
                type="text"
                name="street"
                placeholder="Вулиця"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              <input
                onChange={onChangeHandler}
                value={data.houseNumber}
                type="text"
                name="houseNumber"
                placeholder="Номер будинку"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
            </>
          )}

          {/* Поля для Самовивозу */}
          {data.deliveryMethod === "Самовивіз" && (
            <>
              <input
                onChange={onChangeHandler}
                value={data.city}
                type="text"
                name="city"
                placeholder="Місто (Київ, Львів, Харків)"
                className="ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3"
              />
              {errors.city && <p className="text-red-500">{errors.city}</p>}
            </>
          )}
        </div>

        {/* cart total*/}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col ">
            <h4
              style={{ fontFamily: "Montserrat Alternates" }}
              className="font-semibold text-xl md:text-2xl mb-5"
            >
              Підсумок замовлення
            </h4>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-200 items-center">
                  {" "}
                  {/* Додав items-center для кращого вирівнювання по вертикалі */}
                  <h4 className="text-base text-gray-600">Сума товарів:</h4>
                  <h4 className="text-base font-medium text-gray-800">
                    {totalAmount} грн
                  </h4>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200 items-center">
                  <h4 className="text-base text-gray-600">Попередня сума:</h4>
                  <h4 className="text-base font-medium text-gray-800">
                    {displayPreliminarySum} грн
                  </h4>
                </div>
                <div className="flex justify-between py-3 items-center">
                  <h4 className="text-lg font-semibold">Всього:</h4>
                  <h4 className="text-lg font-semibold">
                    {totalAmount} грн
                  </h4>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full bg-[#54A5D9] hover:bg-[#4389b9] text-white font-medium py-3 rounded-md transition-colors duration-200 text-base"
            >
              Перейти до оплати
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default Order;

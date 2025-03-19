import React, { useContext, useEffect } from 'react';
import { ShopContext } from "../context/ShopContext";
import axios from 'axios';
import { toast } from 'react-toastify';


const Order = () => {
    const navigate = useNavigate()
    const { getTotalCartAmount, token, all_products, cartItems, url } = useContext(ShopContext)

    const [data, setData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        comment: "",
        deliveryMethod: "", // Спосіб доставки
        region: "", // Область
        city: "", // Місто
        postalCode: "", // Поштовий індекс
        street: "", // Вулиця
        houseNumber: "", // Номер будинку
        departmentNumber: "" // Номер відділення/поштомату
    })


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
                departmentNumber: ""
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

        let orderItems = [];
        all_products.forEach((item) => {
            if (cartItems[item._id] > 0) {
                let itemInfo = {
                    _id: item._id, // Додаємо ID товару
                    name: item.name,
                    price: item.price,
                    quantity: cartItems[item._id],
                    image: item.image // Додаємо зображення товару
                };
                orderItems.push(itemInfo);
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
                email: data.email,
                phone: data.phone,
                region: data.region,
                city: data.city,
                postalCode: data.postalCode,
                street: data.street,
                houseNumber: data.houseNumber,
                departmentNumber: data.departmentNumber
            }
        };

        try {
            let response = await axios.post(url + "/api/order/place", orderData, { headers: { token } });
            if (response.data.success) {
                const { session_url } = response.data;
                toast.success(`Ваше замовлення №${orderNumber} успішно оформлено!`);
                window.location.replace(session_url);
            } else {
                toast.error("Помилка при оформленні замовлення");
            }
        } catch (error) {
            toast.error("Сталася помилка при відправці даних");
            console.error("Помилка:", error);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Перевірка для Нової Пошти
        if (data.deliveryMethod === "Нова Пошта") {
            if (!data.region) newErrors.region = "Вкажіть область";
            if (!data.city) newErrors.city = "Вкажіть місто";
            if (!data.departmentNumber) newErrors.departmentNumber = "Вкажіть номер відділення або поштомату";
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
                newErrors.city = "Самовивіз доступний тільки у Києві, Львові або Харкові";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Повертає true, якщо помилок немає
    };

    useEffect(() => {
        if (!token) {
            toast.error("Будь ласка, авторизуйтеся, щоб оформити замовлення.");
            navigate("/cart")
        } else if (getTotalCartAmount() === 0) {
            toast.error("Ваш кошик порожній. Додайте товари для оформлення замовлення.");
            navigate("/cart")
        }
    }, [token])

    return (
        <section className="max-padd-container py-28 xl:py-32">
            <form onSubmit={placeOrder} className="flex flex-col xl:flex-row gap-20 xl:gap-28">
                {/*delivery information*/}
                <div className='flex flex-1 flex-col gap-3 text-[95%]'>
                    <h3 className='bold-28 mb-4'>Інформація про доставку</h3>
                    <div className='flex gap-3'>
                        <input
                            onChange={onChangeHandler}
                            value={data.firstName}
                            type="text"
                            name="firstname"
                            placeholder='First name'
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2'
                        />
                        <input
                            onChange={onChangeHandler}
                            value={data.lastName}
                            type="text"
                            name="lastname"
                            placeholder='Last name'
                            className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2'
                        />
                    </div>
                    <input
                        onChange={onChangeHandler}
                        value={data.email}
                        type="email"
                        name="email"
                        placeholder='Email'
                        className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2'
                    />
                    <input
                        onChange={onChangeHandler}
                        value={data.phone}
                        type="text"
                        name="phone"
                        placeholder='Phone number'
                        className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-1/2'
                    />
                    <textarea
                        onChange={onChangeHandler}
                        value={data.comment}
                        name="comment"
                        placeholder="Коментар до замовлення (необов'язково)"
                        className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                        rows="4"
                    />
                    {/* Спосіб доставки */}
                    <select
                        onChange={onChangeHandler}
                        value={data.deliveryMethod}
                        name="deliveryMethod"
                        className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
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
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.city}
                                type="text"
                                name="city"
                                placeholder="Місто"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.departmentNumber}
                                type="text"
                                name="departmentNumber"
                                placeholder="Номер відділення або поштомату"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            {errors.departmentNumber && <p className="text-red-500">{errors.departmentNumber}</p>}
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
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.city}
                                type="text"
                                name="city"
                                placeholder="Місто"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.postalCode}
                                type="text"
                                name="postalCode"
                                placeholder="Поштовий індекс"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.street}
                                type="text"
                                name="street"
                                placeholder="Вулиця"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.houseNumber}
                                type="text"
                                name="houseNumber"
                                placeholder="Номер будинку"
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
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
                                className='ring-1 ring-slate-900/15 p-1 pl-3 rounded-sm outline-none w-full mb-3'
                            />
                            {errors.city && <p className="text-red-500">{errors.city}</p>}
                        </>
                    )}
                </div>

                {/* cart total*/}
                <div className='flex flex-1 flex-col'>
                    <div className='flex flex-col gap-2'>
                        <h4 className='bold-22'>Summary</h4>
                        <div>
                            <div className='flexBetween py-3'>
                                <h4 className='medium-16'>Subtotal:</h4>
                                <h4 className='text-gray-30 font-semibold'>
                                    ${getTotalCartAmount()}
                                </h4>
                            </div>
                            <hr className='h-[2px] bg-slate-900/15' />
                            <div className='flexBetween py-3'>
                                <h4 className='medium-16'> Shipping fee:</h4>
                                <h4 className='text-gray-30 font-semibold'>
                                    ${getTotalCartAmount() === 0 ? 0 : 2}
                                </h4>
                            </div>
                            <hr className='h-[2px] bg-slate-900/15' />
                            <div className='flexBetween py-3'>
                                <h4 className='medium-18'>Total:</h4>
                                <h4 className='bold-18'>
                                    ${getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 2}
                                </h4>
                            </div>
                        </div>
                        <button type='submit' className='btn-secondary w-56 rounded-sm'>
                            Proceed to payment
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
};

export default Order
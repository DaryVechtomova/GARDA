import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa6';

const AddSupplier = () => {
    const url = "http://localhost:4000";
    const [data, setData] = useState({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "Україна",
        cooperationStartDate: new Date().toISOString().split('T')[0], // Поточна дата за замовчуванням
        productType: "Оберіть тип продукції",
        status: "Оберіть статус",
        notes: "",
    });

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();

        try {
            const response = await axios.post(`${url}/api/suppliers/add-supplier`, data);
            if (response.data.success) {
                toast.success(response.data.message);
                // Очищення форми після успішного додавання
                setData({
                    companyName: "",
                    contactPerson: "",
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                    country: "Україна",
                    cooperationStartDate: new Date().toISOString().split('T')[0],
                    productType: "Оберіть тип продукції",
                    status: "Оберіть статус",
                    notes: "",
                });
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            if (error.response) {
                toast.error(error.response.data.message || "Не вдалося додати постачальника");
            } else if (error.request) {
                toast.error("Не вдалося отримати відповідь від сервера");
            } else {
                toast.error("Помилка при налаштуванні запиту");
            }
            console.error("Помилка:", error);
        }
    };

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Додавання постачальника</h4>

                {/* Поля форми */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Назва компанії</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.companyName}
                        name="companyName"
                        type="text"
                        placeholder='Введіть назву компанії..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Контактна особа</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.contactPerson}
                        name="contactPerson"
                        type="text"
                        placeholder='Введіть контактну особу..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Email</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.email}
                        name="email"
                        type="email"
                        placeholder='Введіть email..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Телефон</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.phone}
                        name="phone"
                        type="text"
                        placeholder='Введіть телефон..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Адреса</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.address}
                        name="address"
                        type="text"
                        placeholder='Введіть адресу..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Місто</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.city}
                        name="city"
                        type="text"
                        placeholder='Введіть місто..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Країна</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.country}
                        name="country"
                        type="text"
                        placeholder='Введіть країну..'
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Дата початку співпраці</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.cooperationStartDate}
                        name="cooperationStartDate"
                        type="date"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex items-center gap-x-6 text-black medium-15">
                    <p className='text-base'>Тип продукції</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.productType}
                        name="productType"
                        className="outline-none ring-1 ring-slate-900/10 py-1"
                    >
                        <option value="Оберіть тип продукції">Оберіть тип продукції</option>
                        <option value="одяг">Одяг</option>
                        <option value="взуття">Взуття</option>
                        <option value="аксесуари">Аксесуари</option>
                        <option value="інше">Інше</option>
                    </select>
                </div>

                <div className="flex items-center gap-x-6 text-black medium-15">
                    <p className='text-base'>Статус</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.status}
                        name="status"
                        className="outline-none ring-1 ring-slate-900/10 py-1"
                    >
                        <option value="Оберіть статус">Оберіть статус</option>
                        <option value="активний">Активний</option>
                        <option value="призупинений">Призупинений</option>
                        <option value="завершений">Завершений</option>
                    </select>
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Нотатки</p>
                    <textarea
                        onChange={onChangeHandler}
                        value={data.notes}
                        name="notes"
                        placeholder='Введіть нотатки..'
                        rows={4}
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none resize-none"
                    ></textarea>
                </div>
                {/* Кнопка додавання постачальника */}
                <button type='submit' className="bg-[#fbb42c] hover:bg-[#d0882a] font-bold text-black sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaPlus />
                    Додати постачальника
                </button>
            </form>
        </section>
    );
};

export default AddSupplier;
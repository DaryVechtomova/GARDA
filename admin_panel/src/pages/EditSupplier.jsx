import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa6';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaTrash } from 'react-icons/fa';

const EditSupplier = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "Україна",
        cooperationStartDate: "",
        cooperationEndDate: "",
        productType: "Оберіть тип продукції",
        status: "Оберіть статус",
        notes: ""
    });

    const formatDate = (dateString) => {
        if (!dateString) return "";
        if (dateString.includes("T")) {
            return dateString.split("T")[0];
        }
        if (dateString.includes(".")) {
            const [day, month, year] = dateString.split(".");
            return `${year}-${month}-${day}`;
        }
        return dateString;
    };

    useEffect(() => {
        const fetchSupplier = async () => {
            try {
                const response = await axios.get(`${url}/api/suppliers/edit-supplier/${id}`);
                if (response.data.success) {
                    const supplierData = response.data.data;
                    supplierData.cooperationStartDate = formatDate(supplierData.cooperationStartDate);
                    supplierData.cooperationEndDate = formatDate(supplierData.cooperationEndDate);
                    setData(supplierData);
                } else {
                    toast.error("Помилка завантаження постачальника");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
                console.error("Помилка:", error);
            }
        };
        fetchSupplier();
    }, [id]);

    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post(`${url}/api/suppliers/edit-supplier`, {
                id: data._id,
                ...data,
            });
            if (response.data.success) {
                toast.success(response.data.message);
                navigate("/list-supplier");
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Помилка при оновленні постачальника");
            console.error("Помилка:", error);
        }
    };

    const isDisabled = data.status === "завершений";

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Редагування постачальника</h4>

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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
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
                        disabled={isDisabled}
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Дата початку співпраці</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.cooperationStartDate}
                    </div>
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Дата завершення співпраці</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.cooperationEndDate || "Не вказано"}
                    </div>
                </div>
                <div className="flex items-center gap-x-6 text-black medium-15">
                    <p className='text-base'>Тип продукції</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.productType}
                        name="productType"
                        className="outline-none ring-1 ring-slate-900/10 py-1"
                        disabled={isDisabled}
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
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none resize-none"
                        rows={4}
                        disabled={isDisabled}
                    />
                </div>

                {/* Кнопка додавання постачальника */}
                <button type='submit' className="btn-dark sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaSave />
                    Зберегти зміни
                </button>
            </form>
        </section>
    );
};

export default EditSupplier;
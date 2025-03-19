import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

const SupplierDetails = () => {
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

    // Функція для перетворення дати у формат рррр-мм-дд
    const formatDate = (dateString) => {
        if (!dateString) return "";

        // Якщо дата у форматі ISO (наприклад, "2025-03-17T16:41:06.235Z")
        if (dateString.includes("T")) {
            return dateString.split("T")[0]; // Повертаємо лише частину з датою (рррр-мм-дд)
        }

        // Якщо дата у форматі дд.мм.рррр
        if (dateString.includes(".")) {
            const [day, month, year] = dateString.split(".");
            return `${year}-${month}-${day}`;
        }

        return dateString; // Якщо дата вже у форматі рррр-мм-дд
    };


    useEffect(() => {
        const fetchSupplier = async () => {
            try {
                const response = await axios.get(`${url}/api/suppliers/details/${id}`);
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

    const hasValue = (value) => {
        return value !== null && value !== undefined && value !== "";
    };

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="flex flex-col gap-y-5 max-w-{555px}">
                <h4 className="bold-22 pb-2 uppercase">Деталі постачальника</h4>

                {/* Поля форми */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Назва компанії</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.companyName}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Контактна особа</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.contactPerson}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Email</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.email}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Телефон</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.phone}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Адреса</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.address}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Місто</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.city}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Країна</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.country}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Дата початку співпраці</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.cooperationStartDate}
                    </div>
                </div>
                {hasValue(data.notes) && (
                    <div className="flex flex-col gap-y-2">
                        <p className='text-base'>Дата завершення співпраці</p>
                        <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                            {data.cooperationEndDate}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-x-6 text-black medium-15">
                    <p className='text-base'>Тип продукції</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.productType}
                    </div>
                </div>

                <div className="flex items-center gap-x-6 text-black medium-15">
                    <p className='text-base'>Статус</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.status}
                    </div>
                </div>
                {hasValue(data.notes) && (
                    <div className="flex flex-col gap-y-2">
                        <p className='text-base'>Нотатки</p>
                        <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                            {data.notes}
                        </div>
                    </div>
                )}

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

export default SupplierDetails;
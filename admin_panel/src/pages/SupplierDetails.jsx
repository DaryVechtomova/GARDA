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
        <section className="p-10 w-full bg-gray-100 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <h4 className="text-2xl font-bold text-black border-b pb-3 mb-4 uppercase">Деталі постачальника</h4>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Назва компанії</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.companyName}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Контактна особа</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.contactPerson}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Email</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.email}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Телефон</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.phone}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Країна</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.country}
                        </div>
                    </div>


                    <div>
                        <p className='text-lg font-semibold text-black'>Місто</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.city}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Адреса</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.address}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Дата початку співпраці</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.cooperationStartDate}
                        </div>
                    </div>
                </div>

                {hasValue(data.cooperationEndDate) && (
                    <div className="grid grid-cols-2 gap-6 mt-6">
                        <div>
                            <p className='text-lg font-semibold text-black'>Дата завершення співпраці</p>
                            <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                                {data.cooperationEndDate}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Тип продукції</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.productType}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Статус</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.status}
                        </div>
                    </div>
                </div>

                {hasValue(data.notes) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Нотатки</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.notes}
                        </div>
                    </div>
                )}

                <div className="mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-md hover:bg-yellow-600 transition"
                    >
                        Назад
                    </button>
                </div>
            </div>
        </section>
    );
};

export default SupplierDetails;
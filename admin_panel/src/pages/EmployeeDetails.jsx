import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, NavLink, useNavigate } from 'react-router-dom';

function EmployeeDetails() {
    const url = "http://localhost:4000";
    const { id } = useParams(); // Отримуємо ID співробітника з URL
    const [employee, setEmployee] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Отримання деталей співробітника
    const fetchEmployeeDetails = async () => {
        try {
            const response = await axios.get(`${url}/api/user/details/${id}`);
            if (response.data.success) {
                setEmployee(response.data.data);
            } else {
                toast.error("Не вдалося завантажити дані співробітника");
            }
        } catch (error) {
            toast.error("Помилка при отриманні даних");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id]);

    if (loading) {
        return <div className="p-4 pl-[16%]">Завантаження...</div>;
    }

    if (!employee) {
        return <div className="p-4 pl-[16%]">Дані співробітника не знайдено.</div>;
    }

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Деталі співробітника</h4>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-600">Ім'я:</p>
                            <p className="font-semibold">{employee.firstName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Прізвище:</p>
                            <p className="font-semibold">{employee.secondName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Пошта:</p>
                            <p className="font-semibold">{employee.email}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Телефон:</p>
                            <p className="font-semibold">{employee.phoneNumber}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Роль:</p>
                            <p className="font-semibold">{employee.role}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Дата прийому на роботу:</p>
                            <p className="font-semibold">
                                {new Date(employee.hireDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Дата звільнення:</p>
                            <p className="font-semibold">
                                {employee.fireDate
                                    ? new Date(employee.fireDate).toLocaleDateString()
                                    : "Не звільнений"}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Статус:</p>
                            <p className="font-semibold">
                                {employee.isActive ? "Активний" : "Неактивний"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition"
                        >
                            Назад
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EmployeeDetails;
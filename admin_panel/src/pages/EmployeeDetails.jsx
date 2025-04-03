import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

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
        return <div className="p-10 w-full bg-gray-100 flex justify-center">Завантаження...</div>;
    }

    if (!employee) {
        return <div className="p-10 w-full bg-gray-100 flex justify-center">Дані співробітника не знайдено.</div>;
    }

    return (
        <section className="p-10 w-full bg-gray-100 flex justify-center min-h-screen">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <h4 className="text-2xl font-bold text-black border-b pb-3 mb-4 uppercase">Деталі співробітника</h4>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Ім'я</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.firstName}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Прізвище</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.secondName}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Пошта</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.email}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Телефон</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.phoneNumber}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Роль</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.role}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Статус</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.isActive ? "Активний" : "Неактивний"}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Дата прийому на роботу</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {new Date(employee.hireDate).toLocaleDateString()}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Дата звільнення</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {employee.fireDate
                                ? new Date(employee.fireDate).toLocaleDateString()
                                : "Не звільнений"}
                        </div>
                    </div>


                </div>

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
}

export default EmployeeDetails;
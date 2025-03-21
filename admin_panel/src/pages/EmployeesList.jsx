import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { TbTrash, TbEdit } from "react-icons/tb";
import { NavLink } from 'react-router-dom';

function EmployeesList() {
    const url = "http://localhost:4000";
    const [employees, setEmployees] = useState([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);

    // Отримання списку співробітників
    const fetchEmployees = async () => {
        try {
            const response = await axios.get(`${url}/api/user/list-employees`);
            if (response.data.success) {
                if (response.data.data.length === 0) {
                    toast.info("Працівників ще немає");
                    setSuppliers([]);
                } else {
                    setEmployees(response.data.data);
                }
            } else {
                toast.error("Помилка завантаження списку співробітників");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані");
        }
    };

    // Видалення співробітника
    const removeEmployee = async (employeeId) => {
        try {
            const response = await axios.post(`${url}/api/user/remove-employee`, { id: employeeId });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchEmployees();
            } else {
                toast.error("Помилка при видаленні співробітника");
            }
        } catch (error) {
            toast.error("Не вдалося видалити співробітника");
        } finally {
            setShowDeleteConfirmation(false);
        }
    };

    // Відкриття модального вікна для підтвердження видалення
    const handleDeleteClick = (employeeId) => {
        setEmployeeToDelete(employeeId);
        setShowDeleteConfirmation(true);
    };

    // Підтвердження видалення
    const confirmDelete = () => {
        if (employeeToDelete) {
            removeEmployee(employeeToDelete);
        }
    };

    // Скасування видалення
    const cancelDelete = () => {
        setEmployeeToDelete(null);
        setShowDeleteConfirmation(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список співробітників</h4>
                {/* Кнопка для додавання нового співробітника */}
                <NavLink to="/add-employee">
                    <button className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition mb-4">
                        Додати співробітника
                    </button>
                </NavLink>
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className='p-3 border'>Ім'я</th>
                            <th className='p-3 border'>Прізвище</th>
                            <th className='p-3 border'>Пошта</th>
                            <th className='p-3 border'>Телефон</th>
                            <th className='p-3 border'>Роль</th>
                            <th className='p-3 border w-20'>Редагувати</th>
                            <th className='p-3 border w-20'>Видалити</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((employee) => (
                            <tr key={employee._id}>
                                <td className="p-3 border">{employee.firstName}</td>
                                <td className="p-3 border">{employee.secondName}</td>
                                <td className="p-3 border">{employee.email}</td>
                                <td className="p-3 border">{employee.phoneNumber}</td>
                                <td className="p-3 border">{employee.role}</td>
                                <td className="p-3 border justify-center items-center">
                                    <NavLink to={`/edit-employee/${employee._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <TbEdit size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <div className="flex justify-center">
                                        <TbTrash
                                            onClick={() => handleDeleteClick(employee._id)}
                                            className="text-red-500 hover:text-red-700 cursor-pointer"
                                            size={20}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Модальне вікно підтвердження видалення */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg">
                        <h2 className="text-lg font-bold mb-4">Підтвердження видалення</h2>
                        <p>Ви впевнені, що хочете видалити цього співробітника?</p>
                        <div className="flex justify-end gap-4 mt-4">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Видалити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default EmployeesList;
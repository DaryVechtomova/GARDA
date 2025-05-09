import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus, FaArrowLeft, FaSpinner } from 'react-icons/fa'; // Оновив іконки
import { IMaskInput } from 'react-imask';
import { useNavigate } from 'react-router-dom'; // Для кнопки "Назад"

const AddEmployee = () => {
    const url = "http://localhost:4000";
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [employeeData, setEmployeeData] = useState({ // Змінив назву стану
        firstName: "",
        secondName: "",
        middleName: "",
        email: "",
        phoneNumber: "",
        password: "",
        birthDate: "",
        role: "", // Порожнє для валідації
    });

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setEmployeeData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Обробник зміни для IMaskInput (телефон)
    const onPhoneAccept = (value) => {
        setEmployeeData((prevData) => ({ ...prevData, phoneNumber: value }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            // Переконуємося, що надсилаємо правильні дані (можливо, без confirmPassword)
            const dataToSend = { ...employeeData };
            // delete dataToSend.confirmPassword; // Якщо було поле підтвердження

            const response = await axios.post(`${url}/api/user/register-employee`, dataToSend);

            if (response.data.success) {
                toast.success(response.data.message || "Співробітника успішно додано!");
                // Очищення форми
                setEmployeeData({
                    firstName: "", secondName: "", middleName: "", email: "",
                    phoneNumber: "", password: "", birthDate: "", role: "",
                });
                // Опціонально: navigate('/admin_panel/list-employees');
            } else {
                toast.error(response.data.message || "Не вдалося додати співробітника.");
            }
        } catch (error) {
            console.error("Помилка додавання співробітника:", error);
            const errorMsg = error.response?.data?.message || error.message || "Сталася невідома помилка";
            toast.error(`Помилка: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-[92vh]">
            <section className="p-10 w-full flex justify-center">
                <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-xl font-semibold pb-4 mb-6 uppercase border-b text-gray-800">
                        Додавання нового співробітника
                    </h4>

                    <form onSubmit={onSubmitHandler} className="space-y-4">
                        {/* Grid для полів */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                            {/* Ім'я */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="firstName" className='text-sm font-medium text-gray-600'>Ім'я <span className="text-red-500">*</span></label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    placeholder="Іван"
                                    value={employeeData.firstName}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Прізвище */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="secondName" className='text-sm font-medium text-gray-600'>Прізвище <span className="text-red-500">*</span></label>
                                <input
                                    id="secondName"
                                    name="secondName"
                                    type="text"
                                    placeholder="Петренко"
                                    value={employeeData.secondName}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* По батькові */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="middleName" className='text-sm font-medium text-gray-600'>По батькові <span className="text-red-500">*</span></label>
                                <input
                                    id="middleName"
                                    name="middleName"
                                    type="text"
                                    placeholder="Сергійович"
                                    value={employeeData.middleName}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Дата народження */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="birthDate" className='text-sm font-medium text-gray-600'>Дата народження <span className="text-red-500">*</span></label>
                                <input
                                    id="birthDate"
                                    name="birthDate"
                                    type="date"
                                    value={employeeData.birthDate}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="email" className='text-sm font-medium text-gray-600'>Email (Логін) <span className="text-red-500">*</span></label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="ivan.petrenko@example.com"
                                    value={employeeData.email}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Телефон */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="phoneNumber" className='text-sm font-medium text-gray-600'>Телефон <span className="text-red-500">*</span></label>
                                <IMaskInput
                                    mask="+38 (000) 000-00-00"
                                    value={employeeData.phoneNumber}
                                    onAccept={onPhoneAccept}
                                    placeholder="+38 (0XX) XXX-XX-XX"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Пароль */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="password" className='text-sm font-medium text-gray-600'>Пароль <span className="text-red-500">*</span></label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Мінімум 6 символів"
                                    value={employeeData.password}
                                    onChange={onChangeHandler}
                                    minLength="6" // Додав мінімальну довжину
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                                />
                            </div>

                            {/* Роль */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="role" className='text-sm font-medium text-gray-600'>Роль <span className="text-red-500">*</span></label>
                                <select
                                    id="role"
                                    name="role"
                                    value={employeeData.role}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
                                >
                                    <option value="" disabled>-- Оберіть роль --</option>
                                    <option value="комірник">Комірник</option>
                                    <option value="адміністратор">Адміністратор</option>
                                    <option value="менеджер з продажу">Менеджер з продажу</option>
                                    {/* Додайте інші ролі, якщо потрібно */}
                                </select>
                            </div>

                        </div> {/* Кінець Grid */}

                        {/* Кнопки */}
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate(-1)} // Кнопка Назад/Скасувати
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
                            >
                                <FaArrowLeft /> Скасувати
                            </button>
                            <button
                                type='submit'
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                                disabled={isSaving}
                            >
                                {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                {isSaving ? 'Збереження...' : 'Додати співробітника'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div >
    );
};

export default AddEmployee;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaArrowLeft, FaSpinner } from 'react-icons/fa'; // Оновив іконки
import { IMaskInput } from 'react-imask';

const EditEmployee = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [initialEmail, setInitialEmail] = useState(''); // Зберігаємо початковий email
    const [data, setData] = useState({
        firstName: "",
        secondName: "",
        middleName: "",
        email: "", // Email не редагується
        phoneNumber: "",
        birthDate: "",
        role: "користувач", // Початкове значення
    });

    // Форматування дати для input type="date"
    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "";
        }
    };

    // Завантаження даних співробітника
    useEffect(() => {
        const fetchEmployee = async () => {
            if (!id) {
                toast.error("ID співробітника не вказано.");
                navigate('/admin_panel/list-employees');
                return;
            }
            setLoading(true);
            try {
                // Використовуємо GET-запит для отримання даних
                const response = await axios.get(`${url}/api/user/edit-employee/${id}`);

                if (response.data.success) {
                    const employeeData = response.data.data;
                    const formattedData = {
                        ...employeeData,
                        birthDate: formatDateForInput(employeeData.birthDate),
                        phoneNumber: employeeData.phoneNumber || "", // Переконуємось, що є значення
                        role: employeeData.role || "користувач", // Значення за замовчуванням
                    };
                    setData(formattedData);
                    setInitialEmail(formattedData.email); // Зберігаємо початковий email
                } else {
                    toast.error(response.data.message || "Не вдалося завантажити дані співробітника");
                    navigate('/admin_panel/list-employees');
                }
            } catch (error) {
                toast.error("Помилка сервера при завантаженні даних");
                console.error("Помилка завантаження:", error);
                navigate('/admin_panel/list-employees');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id, navigate, url]);

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Обробник зміни телефону
    const onPhoneAccept = (value) => {
        setData((prevData) => ({ ...prevData, phoneNumber: value }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            const response = await axios.post(`${url}/api/user/edit-employee`, {
                id: data._id, // Переконуємось, що ID є
                ...data,
            }); // POST або PUT, залежно від API

            if (response.data.success) {
                toast.success(response.data.message || "Дані співробітника успішно оновлено!");
                navigate('/admin_panel/list-employees');
            } else {
                toast.error(response.data.message || "Не вдалося оновити співробітника.");
            }
        } catch (error) {
            console.error("Помилка оновлення:", error);
            const errorMsg = error.response?.data?.message || error.message || "Сталася невідома помилка";
            toast.error(`Помилка: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="w-full min-h-screen flex justify-center items-center">
                <div className="flex items-center gap-2 text-gray-500">
                    <FaSpinner className="animate-spin text-xl" />
                    <span>Завантаження даних співробітника...</span>
                </div>
            </section>
        );
    }

    if (!data || !data._id) { // Перевірка, чи завантажено дані
        return (
            <section className="w-full min-h-screen flex flex-col justify-center items-center gap-4">
                <p className="text-red-500 text-lg">Не вдалося завантажити дані для редагування.</p>
                <button
                    onClick={() => navigate('/admin_panel/list-employees')}
                    className="inline-flex items-center gap-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600 transition text-sm"
                >
                    <FaArrowLeft /> До списку співробітників
                </button>
            </section>
        );
    }

    return (
        <section className="p-10 w-full bg-gray-100 min-h-[92vh] flex justify-center">
            <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-semibold pb-4 mb-6 uppercase border-b text-gray-800">
                    Редагування співробітника: {data.secondName} {data.firstName}
                </h4>

                <form onSubmit={onSubmitHandler} className="space-y-4">
                    {/* Grid для полів */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                        {/* Ім'я */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="firstName" className='text-sm font-medium text-gray-600'>Ім'я <span className="text-red-500">*</span></label>
                            <input
                                id="firstName" name="firstName" type="text" placeholder="Іван"
                                value={data.firstName} onChange={onChangeHandler}
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                            />
                        </div>

                        {/* Прізвище */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="secondName" className='text-sm font-medium text-gray-600'>Прізвище <span className="text-red-500">*</span></label>
                            <input
                                id="secondName" name="secondName" type="text" placeholder="Петренко"
                                value={data.secondName} onChange={onChangeHandler}
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                            />
                        </div>

                        {/* По батькові */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="middleName" className='text-sm font-medium text-gray-600'>По батькові</label>
                            <input
                                id="middleName" name="middleName" type="text" placeholder="Іванович"
                                value={data.middleName} onChange={onChangeHandler}
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                            />
                        </div>

                        {/* Email (не редагується) */}
                        <div className="flex flex-col gap-y-1">
                            <label className='text-sm font-medium text-gray-600'>Email (Логін)</label>
                            <div className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] bg-gray-100 text-gray-700 flex items-center cursor-not-allowed">
                                {initialEmail} {/* Показуємо початковий email */}
                            </div>
                        </div>

                        {/* Телефон */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="phoneNumber" className='text-sm font-medium text-gray-600'>Телефон <span className="text-red-500">*</span></label>
                            <IMaskInput
                                mask="+38 (000) 000-00-00"
                                value={data.phoneNumber}
                                onAccept={onPhoneAccept}
                                placeholder="+38 (0XX) XXX-XX-XX"
                                id="phoneNumber" name="phoneNumber"
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                            />
                        </div>

                        {/* Дата народження */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="birthDate" className='text-sm font-medium text-gray-600'>Дата народження <span className="text-red-500">*</span></label>
                            <input
                                id="birthDate" name="birthDate" type="date"
                                value={data.birthDate} onChange={onChangeHandler}
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out"
                            />
                        </div>

                        {/* Роль */}
                        <div className="flex flex-col gap-y-1">
                            <label htmlFor="role" className='text-sm font-medium text-gray-600'>Роль <span className="text-red-500">*</span></label>
                            <select
                                id="role" name="role" value={data.role} onChange={onChangeHandler}
                                className="border border-gray-300 rounded-md py-1.5 px-3 outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 h-[38px] transition duration-150 ease-in-out bg-white"
                            >
                                {/* <option value="" disabled>-- Оберіть роль --</option> */}
                                <option value="користувач">Користувач</option>
                                <option value="адміністратор">Адміністратор</option>
                                <option value="комірник">Комірник</option>
                            </select>
                        </div>

                    </div> {/* Кінець Grid */}

                    {/* Кнопки */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm"
                        >
                            <FaArrowLeft /> Скасувати
                        </button>
                        <button
                            type='submit'
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-medium rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default EditEmployee;
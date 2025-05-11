import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaSave, FaKey, FaSpinner, FaUserEdit } from 'react-icons/fa';
import { IMaskInput } from 'react-imask';
import { ShopContext } from "../context/ShopContext";

const Profile = () => {
    const url = "http://localhost:4000"; // Ваш URL бекенду
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { updateUserProfileInContext } = useContext(ShopContext);
    const [userData, setUserData] = useState({
        _id: '',
        firstName: "",
        secondName: "",
        middleName: "",
        email: "",
        phoneNumber: "",
        birthDate: "",
        region: "",
        city: "",
        street: "",
        houseNumber: "",
        apartmentNumber: "",
        postalCode: ""
    });

    // Форматування дати для input type="date" (YYYY-MM-DD)
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

    // Завантаження даних поточного користувача
    useEffect(() => {
        const fetchCurrentUserProfile = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    navigate('/login');
                    return;
                }
                const response = await axios.get(`${url}/api/user/my-profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.data.success && response.data.userData) {
                    const fetchedData = response.data.userData;
                    setUserData({
                        _id: fetchedData.id || fetchedData._id, // Отримуємо ID
                        firstName: fetchedData.firstName || "",
                        secondName: fetchedData.secondName || "",
                        middleName: fetchedData.middleName || "",
                        email: fetchedData.email || "",
                        phoneNumber: fetchedData.phoneNumber || "",
                        birthDate: formatDateForInput(fetchedData.birthDate),
                        region: fetchedData.region || "",
                        city: fetchedData.city || "",
                        street: fetchedData.street || "",
                        houseNumber: fetchedData.houseNumber || "",
                        apartmentNumber: fetchedData.apartmentNumber || "",
                        postalCode: fetchedData.postalCode || ""
                    });
                } else {
                    toast.error(response.data.message || "Не вдалося завантажити дані профілю");
                    // Можливо, перенаправити на логін, якщо не авторизовано
                    // navigate('/login'); // Або navigate('/')
                }
            } catch (error) {
                console.error("Помилка завантаження профілю користувача:", error);
                // Якщо 401 помилка (не авторизований), то перенаправити на логін
                if (error.response && error.response.status === 401) {
                    toast.info("Будь ласка, увійдіть до системи.");
                    // navigate('/login'); // Або показати форму логіна
                } else {
                    toast.error("Помилка сервера при завантаженні профілю");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCurrentUserProfile();
    }, [url, navigate]); // Додав navigate до залежностей

    const onChangeHandler = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const onPhoneAccept = (value) => {
        setUserData(prev => ({ ...prev, phoneNumber: value }));
    };

    // Збереження змін
    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Будь ласка, увійдіть до системи");
                navigate('/login');
                return;
            }
            // Відправляємо тільки ті поля, які можна редагувати клієнтом
            const { role, _id, ...dataToSave } = userData;

            const response = await axios.put(
                `${url}/api/user/update-client-profile`,
                dataToSave,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (response.data.success) {
                toast.success("Профіль успішно оновлено!");
                if (response.data.updatedUser) {
                    const updatedData = response.data.updatedUser;
                    // Оновлюємо локальний стан userData
                    setUserData(prev => ({
                        ...prev,
                        ...updatedData,
                        birthDate: formatDateForInput(updatedData.birthDate),
                    }));
                    // Оновлюємо дані в ShopContext
                    if (updateUserProfileInContext) {
                        updateUserProfileInContext(updatedData);
                    }
                }
            } else {
                toast.error(response.data.message || "Помилка оновлення профілю");
            }
        } catch (error) {
            console.error("Помилка збереження профілю:", error);
            toast.error(error.response?.data?.message || "Помилка сервера");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="w-full min-h-[80vh] flex justify-center items-center">
                <div className="flex items-center gap-2 text-gray-500">
                    <FaSpinner className="animate-spin text-2xl" />
                    <span>Завантаження профілю...</span>
                </div>
            </section>
        );
    }

    if (!userData._id) { // Перевіряємо чи є ID
        return (
            <section className="w-full min-h-[80vh] flex flex-col justify-center items-center gap-4 px-4 text-center">
                <p className="text-red-600 text-lg">Не вдалося завантажити дані профілю.</p>
                <p className="text-gray-600">Можливо, вам потрібно увійти до системи.</p>
                {/* Можна додати кнопку для логіну */}
            </section>
        );
    }


    return (
        // Контейнер сторінки з відступами
        <section className="py-28 px-4 min-h-[80vh]">
            <div className="w-full max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md border border-gray-200">
                <h4 className="text-xl md:text-2xl font-semibold pb-4 mb-6 uppercase border-b text-gray-800 flex items-center gap-3">
                    <FaUserEdit /> Мій профіль
                </h4>

                <form onSubmit={handleProfileSave} className="space-y-6">

                    {/* --- Персональна інформація --- */}
                    <fieldset className="border border-gray-200 p-4 rounded-md">
                        <legend className="text-base font-medium px-2 text-gray-600">Персональна інформація</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
                            {/* Прізвище */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="secondName" className='text-sm font-medium text-gray-600'>Прізвище <span className="text-red-500">*</span></label>
                                <input id="secondName" name="secondName" type="text" value={userData.secondName} onChange={onChangeHandler} required className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Ім'я */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="firstName" className='text-sm font-medium text-gray-600'>Ім'я <span className="text-red-500">*</span></label>
                                <input id="firstName" name="firstName" type="text" value={userData.firstName} onChange={onChangeHandler} required className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* По батькові */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="middleName" className='text-sm font-medium text-gray-600'>По батькові <span className="text-red-500">*</span></label>
                                <input id="middleName" name="middleName" type="text" value={userData.middleName} onChange={onChangeHandler} required className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Телефон */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="phoneNumber" className='text-sm font-medium text-gray-600'>Телефон <span className="text-red-500">*</span></label>
                                <IMaskInput
                                    mask="+38 (000) 000-00-00"
                                    value={userData.phoneNumber}
                                    onAccept={onPhoneAccept}
                                    placeholder="+38 (0XX) XXX-XX-XX"
                                    id="phoneNumber" name="phoneNumber" required
                                    className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                                />
                            </div>
                            {/* Дата народження */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="birthDate" className='text-sm font-medium text-gray-600'>Дата народження</label>
                                <input id="birthDate" name="birthDate" type="date" value={userData.birthDate} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Email (редагування) */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="email" className='text-sm font-medium text-gray-600'>Email (Логін)</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={userData.email}
                                    onChange={onChangeHandler}
                                    className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* --- Адреса доставки --- */}
                    <fieldset className="border border-gray-200 p-4 rounded-md">
                        <legend className="text-base font-medium px-2 text-gray-600">Адреса доставки</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
                            {/* Регіон */}
                            <div className="flex flex-col gap-y-1 md:col-span-1">
                                <label htmlFor="region" className='text-sm font-medium text-gray-600'>Область</label>
                                <input id="region" name="region" type="text" placeholder='Київська' value={userData.region} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Місто */}
                            <div className="flex flex-col gap-y-1 md:col-span-1">
                                <label htmlFor="city" className='text-sm font-medium text-gray-600'>Місто</label>
                                <input id="city" name="city" type="text" placeholder='Київ' value={userData.city} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Індекс */}
                            <div className="flex flex-col gap-y-1 md:col-span-1">
                                <label htmlFor="postalCode" className='text-sm font-medium text-gray-600'>Поштовий індекс</label>
                                <input id="postalCode" name="postalCode" type="text" placeholder='01234' value={userData.postalCode} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Вулиця */}
                            <div className="flex flex-col gap-y-1 md:col-span-2">
                                <label htmlFor="street" className='text-sm font-medium text-gray-600'>Вулиця</label>
                                <input id="street" name="street" type="text" placeholder='вул. Хрещатик' value={userData.street} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Будинок */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="houseNumber" className='text-sm font-medium text-gray-600'>Будинок</label>
                                <input id="houseNumber" name="houseNumber" type="text" placeholder='24' value={userData.houseNumber} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            {/* Квартира */}
                            <div className="flex flex-col gap-y-1">
                                <label htmlFor="apartmentNumber" className='text-sm font-medium text-gray-600'>Квартира</label>
                                <input id="apartmentNumber" name="apartmentNumber" type="text" placeholder='10' value={userData.apartmentNumber} onChange={onChangeHandler} className="border border-gray-300 rounded-md py-1.5 px-3 h-[38px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Кнопки */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t mt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/change-password')} // Перехід на сторінку зміни пароля КЛІЄНТА
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition text-sm"
                        >
                            <FaKey /> Змінити пароль
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-sm hover:bg-[#e4a426] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fbb42c] transition text-sm disabled:opacity-50"
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

export default Profile;
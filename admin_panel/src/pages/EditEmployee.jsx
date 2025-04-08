import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaTrash } from 'react-icons/fa';
import { IMaskInput } from 'react-imask';

const EditEmployee = () => {
    const url = "http://localhost:4000";
    const { id } = useParams(); // Отримуємо ID співробітника з URL
    const navigate = useNavigate();
    const [data, setData] = useState({
        firstName: "",
        secondName: "",
        middleName: "",
        email: "",
        phoneNumber: "",
        birthDate: "",
        role: "користувач", // Додано поле для ролі
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

    // Отримання даних співробітника для редагування
    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await axios.get(`${url}/api/user/edit-employee/${id}`);
                if (response.data.success) {
                    const employeeData = response.data.data;
                    employeeData.birthDate = formatDate(employeeData.birthDate);
                    setData(employeeData);
                } else {
                    toast.error("Не вдалося завантажити дані співробітника");
                }
            } catch (error) {
                toast.error("Помилка сервера");
                console.error("Помилка:", error);
            }
        };

        fetchEmployee();
    }, [id]);

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post(`${url}/api/user/edit-employee`, {
                id: data._id,
                ...data,
            });
            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/admin_panel/list-employees'); // Повертаємося до списку співробітників після успішного оновлення
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Помилка при оновленні співробітника");
            console.error("Помилка:", error);
        }
    };

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Редагування співробітника</h4>

                {/* Поля форми */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Ім'я</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.firstName}
                        name="firstName"
                        type="text"
                        placeholder="Введіть ім'я.."
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Прізвище</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.secondName}
                        name="secondName"
                        type="text"
                        placeholder="Введіть прізвище.."
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>По батькові</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.middleName}
                        name="middleName"
                        type="text"
                        placeholder="Введіть по батькові.."
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Пошта</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.email}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Телефон</p>
                    <IMaskInput
                        mask="+38 (000) 000-0000"
                        value={data.phoneNumber}
                        onAccept={(value) => {
                            setData((prevData) => ({ ...prevData, phoneNumber: value }));
                        }}
                        placeholder="+38 (0XX) XXX-XXXX"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Дата народження</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.birthDate}
                        name="birthDate"
                        type="date"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                {/* Поле для вибору ролі */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Роль</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.role}
                        name="role"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    >
                        <option value="користувач">Користувач</option>
                        <option value="адміністратор">Адміністратор</option>
                        <option value="комірник">Комірник</option>
                    </select>
                </div>

                {/* Кнопка оновлення співробітника */}
                <button type='submit' className="btn-dark sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaSave />
                    Зберегти зміни
                </button>
            </form>
        </section>
    );
};

export default EditEmployee;
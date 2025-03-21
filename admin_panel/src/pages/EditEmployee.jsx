import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

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
        role: "комірник",
    });

    // Отримання даних співробітника для редагування
    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await axios.get(`${url}/api/user/get-employee/${id}`);
                if (response.data.success) {
                    setData(response.data.data);
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
            const response = await axios.put(`${url}/api/user/update-employee/${id}`, data);
            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/employees'); // Повертаємося до списку співробітників після успішного оновлення
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Не вдалося оновити дані співробітника");
            console.error("Помилка:", error);
        }
    };

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
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
                    <input
                        onChange={onChangeHandler}
                        value={data.email}
                        name="email"
                        type="email"
                        placeholder="Введіть пошту.."
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Телефон</p>
                    <input
                        onChange={onChangeHandler}
                        value={data.phoneNumber}
                        name="phoneNumber"
                        type="text"
                        placeholder="Введіть телефон.."
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

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Роль</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.role}
                        name="role"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    >
                        <option value="комірник">комірник</option>
                        <option value="адміністратор">адміністратор</option>
                    </select>
                </div>

                {/* Кнопка оновлення співробітника */}
                <button type='submit' className="bg-[#fbb42c] hover:bg-[#d0882a] font-bold text-black sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    Оновити співробітника
                </button>
            </form>
        </section>
    );
};

export default EditEmployee;
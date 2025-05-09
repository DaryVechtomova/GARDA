import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaXmark, FaEye, FaEyeSlash } from 'react-icons/fa6';
import axios from "axios";
import { ShopContext } from '../context/ShopContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { IMaskInput } from 'react-imask';


const LoginPopup = ({ setShowLogin }) => {
    const url = "http://localhost:4000";
    const navigate = useNavigate();
    //const { url, setToken } = useContext(ShopContext);
    const [state, setState] = useState("Sign Up");
    const adminBaseUrl = import.meta.env.VITE_ADMIN_PANEL_BASE_URL || 'http://localhost:5174';
    console.log(adminBaseUrl);
    const [data, setData] = useState({
        firstName: "",
        secondName: "",
        middleName: "",
        phoneNumber: "",
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);

    const onChangeHandler = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setData((data) => ({ ...data, [name]: value }));
    };

    const onLogin = async (event) => {
        event.preventDefault();
        let newUrl = url;

        if (state === "Login") {
            newUrl += "/api/user/login";
        } else {
            newUrl += "/api/user/register";
        }

        try {
            const response = await axios.post(newUrl, data);

            if (response.data.success) {
                toast.success(state === "Login" ? "Успішний вхід!" : "Реєстрація пройшла успішно!");
                const token = response.data.token;
                console.log(response.data.token);
                const role = response.data.role;
                setShowLogin(false);

                // Затримка для toast, перш ніж перейти
                setTimeout(() => {
                    if (role === "користувач") {
                        localStorage.setItem("token", token);
                        localStorage.setItem("role", role);
                        localStorage.setItem("userFirstName", response.data.firstName || '');
                        localStorage.setItem("userSecondName", response.data.secondName || '');
                        localStorage.setItem("userMiddleName", response.data.middleName || '');
                        window.dispatchEvent(new Event('storage'));
                        navigate("/profile");
                    } else if (role === "адміністратор" || role === "комірник" || role === "менеджер з продажу") {
                        console.log("admin");
                        const adminPanelUrl = `${adminBaseUrl}/admin_panel?token=${token}`;
                        console.log("Redirecting to:", adminPanelUrl);
                        window.location.href = adminPanelUrl;
                    }
                }, 1500);
            } else {
                toast.error(response.data.message || "Помилка при вході/реєстрації.");
            }
        } catch (error) {
            console.error("Помилка під час реєстрації/авторизації:", error);
            toast.error(error.response?.data?.message || "Сталася помилка. Спробуйте ще раз.");
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        // <div className='absolute h-full w-full bg-black/40 z-50 flexCenter'>
        <div className='fixed z-50 flexCenter h-full w-full bg-black/40'>
            <ToastContainer />
            <form onSubmit={onLogin} className='bg-white w-[366px] p-7 rounded-xl shadow-md relative z-50'>
                <div className='flex justify-between items-baseline'>
                    <h4 className='bold-28'>{state === "Sign Up" ? "Реєстрація" : "Вхід"}</h4>
                    <FaXmark onClick={() => setShowLogin(false)} className='medium-20 text-slate-900/70 cursor-pointer' />
                </div>
                <div className='flex flex-col gap-4 my-6'>
                    {state === "Sign Up" && (
                        <>
                            <input
                                onChange={onChangeHandler}
                                value={data.firstName}
                                name='firstName'
                                type='text'
                                placeholder='Ім’я'
                                className='bg-primary border p-2 pl-4 rounded-md outline-none'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.secondName}
                                name='secondName'
                                type='text'
                                placeholder='Прізвище'
                                className='bg-primary border p-2 pl-4 rounded-md outline-none'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.middleName}
                                name='middleName'
                                type='text'
                                placeholder='По-батькові'
                                className='bg-primary border p-2 pl-4 rounded-md outline-none'
                            />
                            <input
                                onChange={onChangeHandler}
                                value={data.phoneNumber}
                                name='phoneNumber'
                                type='tel'
                                placeholder='Номер телефону'
                                className='bg-primary border p-2 pl-4 rounded-md outline-none'
                            />
                        </>
                    )}
                    <input
                        onChange={onChangeHandler}
                        value={data.email}
                        name='email'
                        type='email'
                        placeholder='Email'
                        className='bg-primary border p-2 pl-4 rounded-md outline-none'
                    />
                    <div className='relative'>
                        <input
                            onChange={onChangeHandler}
                            value={data.password}
                            name='password'
                            type={showPassword ? "text" : "password"}
                            placeholder='Пароль'
                            className='bg-primary border p-2 pl-4 rounded-md outline-none w-full'
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500'
                        >
                            {showPassword ? <FaEye /> : <FaEyeSlash />}
                        </button>
                    </div>
                </div>
                <button type='submit' className='btn-secondary rounded-md w-full'>
                    {state === "Sign Up" ? "Створити акаунт" : "Увійти"}
                </button>
                <div className='flex items-baseline gap-x-3 mt-6 mb-4 text-sm text-gray-600'>
                    <input type="checkbox" required />
                    <p>Продовжуючи, ви погоджуєтеся з нашими <span className="text-blue-600 underline">Умовами обслуговування</span> та <span className="text-blue-600 underline">Політикою конфіденційності</span>.</p>
                </div>
                {state === "Sign Up" ? (
                    <p className='text-sm'>Вже маєте акаунт? <span onClick={() => setState("Login")} className='text-[#54a5d9] cursor-pointer'>Увійти</span></p>
                ) : (
                    <p className='text-sm'>Не маєте акаунту? <span onClick={() => setState("Sign Up")} className='text-[#54a5d9] cursor-pointer'>Зареєструватися</span></p>
                )}
            </form>
        </div >
    );
};

export default LoginPopup;

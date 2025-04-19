import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdFavoriteBorder } from "react-icons/md";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";
import { CgProfile } from "react-icons/cg";
import { HiMenu, HiX } from "react-icons/hi";
import Navbar from './Navbar';
import { ShopContext } from '../context/ShopContext';
import { TbLogout } from "react-icons/tb"

const Header = ({ setShowLogin }) => {
    const { getTotalCartItems, token, setToken } = useContext(ShopContext);
    const [menuOpened, setMenuOpened] = useState(false);
    const [searchOpened, setSearchOpened] = useState(false);
    const [header, setHeader] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState(''); // Додайте цей стан
    const { url } = useContext(ShopContext); // Додайте url з контексту

    // Функція для обробки пошуку
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            return;
        }
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchOpened(false);
    };

    // Обробник натискання клавіші Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Перевіряємо стан авторизації при завантаженні компонента
    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token); // !! перетворює значення в boolean

        // Додаємо слухач подій для оновлення стану при зміні токена
        const handleStorageChange = () => {
            const newToken = localStorage.getItem("token");
            setIsLoggedIn(!!newToken);
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const toggleMenu = () => {
        setMenuOpened(!menuOpened);
    };

    const toggleSearch = () => {
        setSearchOpened(!searchOpened);
    };
   
    useEffect(() => {
        const handleScroll = () => {
            window.scrollY > 40 ? setHeader(true) : setHeader(false);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setToken(null); // якщо використовуєш глобальний токен
        navigate("/");
    };

    const searchProducts = (products) => {
        if (!searchQuery) return products;
        return products.filter(product =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

   

    return (
        <header className={`${header ? "!py-3 shadow-sm" : ""} fixed w-full top-0 left-0 right-0 py-4 z-30 transition-all bg-[#fcfaf4]`}>
            <div className="max-padd-container">
                <div className="flexBetween">
                    {/* Ліва частина (меню) */}
                    <div className="flex-1 flexStart">
                        {/* Кнопка меню */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={toggleMenu}>
                            {!menuOpened ? (
                                <HiMenu className="text-2xl hover:text-secondary sm:text-3xl" />
                            ) : (
                                <HiX className="text-2xl hover:text-secondary sm:text-3xl" />
                            )}
                            <span className="text-sm hidden sm:block">Меню</span>
                        </div>
                    </div>

                    {/* Логотип по центру */}
                    <div className="flex-1 flexCenter">
                        <Link to={"/"}>
                            <h1 className="text-[24px] sm:text-[30px] font-bold text-center" style={{ fontFamily: "'Labrada', serif" }}>
                                GARDA
                            </h1>
                        </Link>
                    </div>

                    {/* Права частина (іконки) */}
                    <div className="flex-1 flexEnd">
                        <div className="flexBetween gap-x-3 sm:gap-x-8">
                            {/* Пошук */}
                            <div className="flex items-center gap-2">
                            {searchOpened && (
        <div className="relative">
            <input
                type="text"
                placeholder="Пошук..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white border border-gray-300 rounded-md p-2 w-48 shadow-md transition-all duration-300"
            />
            <HiSearch 
                onClick={handleSearch}
                className="absolute right-2 top-2 text-xl hover:text-secondary cursor-pointer" 
            />
        </div>
    )}
                                <div className="flex flex-col items-center gap-1">
                                    <HiSearch 
                                        onClick={() => {
                                            toggleSearch();
                                            if (searchOpened && searchQuery) {
                                                handleSearch();
                                            }
                                        }} 
                                        className="text-2xl hover:text-secondary cursor-pointer sm:text-3xl" 
                                    />
                                    <span className="text-sm hidden sm:block">Пошук</span>
                                </div>
                            </div>
                            {/* Уподобані */}
                            <Link to={"/favorites"} className="flex flex-col items-center gap-1">
                                <MdFavoriteBorder className="text-[22px] hover:text-secondary sm:text-3xl" />
                                <span className="text-sm hidden sm:block">Вподобані</span>
                            </Link>

                            {/* Кошик */}
                            <Link to={"/cart"} className="flex flex-col items-center gap-1 relative">
                                <HiOutlineShoppingBag className="text-[22px] hover:text-secondary sm:text-3xl" />
                                <span className="bg-white text-sm absolute -top-2 -right-3 flexCenter w-5 h-5 rounded-full shadow-md">{getTotalCartItems()}</span>
                                <span className="text-sm hidden sm:block">

                                    Кошик</span>
                            </Link>

                            {/* Профіль */}
                            <div className="flex flex-col items-center gap-1 relative group">



                                {/* Випадаючий список при ховері (Logout) */}
                                {!isLoggedIn ? (
                                    <div
                                        onClick={() => setShowLogin(true)}
                                        className="cursor-pointer"
                                    >
                                        <CgProfile className="text-[22px] hover:text-secondary sm:text-3xl cursor-pointer" />
                                    </div>
                                ) : (
                                    <div>
                                        <Link to={"/profile"} className="flex flex-col items-center gap-1">
                                            <CgProfile className="text-[22px] hover:text-secondary sm:text-3xl cursor-pointer" />
                                        </Link>
                                        <ul className="absolute top-10 right-0 bg-white border rounded shadow-md hidden group-hover:block z-50">

                                            <li
                                                onClick={logout}
                                                className="flex items-center gap-x-2 px-4 py-2 cursor-pointer hover:bg-gray-100"
                                            >
                                                <TbLogout className="text-[19px]" />
                                                <span>Вийти</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                <span className="text-sm hidden sm:block">Профіль</span>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Меню */}
                {menuOpened && (
                    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-40">
                        <div className="p-5">
                            <HiX onClick={toggleMenu} className="cursor-pointer hover:text-secondary text-2xl mb-5" />
                            <Navbar containerStyles={"flex flex-col gap-y-5"} />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdFavoriteBorder } from "react-icons/md";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";
import { CgProfile } from "react-icons/cg";
import { HiMenu, HiX } from "react-icons/hi";
import Navbar from './Navbar'; // Імпортуйте Navbar

const Header = () => {
    const [menuOpened, setMenuOpened] = useState(false);
    const [searchOpened, setSearchOpened] = useState(false);
    const [header, setHeader] = useState(false);

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
                            <span className="text-sm hidden sm:block">Меню</span> {/* Приховуємо текст на малих екранах */}
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
                                    <input
                                        type="text"
                                        placeholder="Пошук..."
                                        className="bg-white border border-gray-300 rounded-md p-2 w-48 shadow-md transition-all duration-300"
                                    />
                                )}
                                <div className="flex flex-col items-center gap-1">
                                    <HiSearch onClick={toggleSearch} className="text-2xl hover:text-secondary cursor-pointer sm:text-3xl" />
                                    <span className="text-sm hidden sm:block">Пошук</span> {/* Приховуємо текст на малих екранах */}
                                </div>
                            </div>

                            {/* Уподобані */}
                            <Link to={"/favorites"} className="flex flex-col items-center gap-1">
                                <MdFavoriteBorder className="text-[22px] hover:text-secondary sm:text-3xl" />
                                <span className="text-sm hidden sm:block">Вподобані</span> {/* Приховуємо текст на малих екранах */}
                            </Link>

                            {/* Кошик */}
                            <Link to={"/cart"} className="flex flex-col items-center gap-1 relative">
                                <HiOutlineShoppingBag className="text-[22px] hover:text-secondary sm:text-3xl" />
                                <span className="bg-white text-sm absolute -top-2 -right-3 flexCenter w-5 h-5 rounded-full shadow-md">0</span>
                                <span className="text-sm hidden sm:block">Кошик</span> {/* Приховуємо текст на малих екранах */}
                            </Link>

                            {/* Профіль */}
                            <Link to={"/profile"} className="flex flex-col items-center gap-1">
                                <CgProfile className="text-[22px] hover:text-secondary sm:text-3xl" />
                                <span className="text-sm hidden sm:block">Профіль</span> {/* Приховуємо текст на малих екранах */}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Меню (з'являється зліва для всіх розмірів екранів) */}
                {menuOpened && (
                    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-40">
                        <div className="p-5">
                            <HiX onClick={toggleMenu} className="cursor-pointer hover:text-secondary text-2xl mb-5" />
                            {/* Додано Navbar у випадаюче меню */}
                            <Navbar containerStyles={"flex flex-col gap-y-5"} />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
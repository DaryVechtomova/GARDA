import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { MdMenu, MdClose } from "react-icons/md";
import { GiShoppingBag } from "react-icons/gi";
import { FaCircleUser } from "react-icons/fa6";
import { FiPackage } from "react-icons/fi";
import { TbLogout } from "react-icons/tb";

const Header = () => {
    const [menuOpened, setMenuOpened] = useState(false);
    const [header, setHeader] = useState(false);
    const [token, setToken] = useState(true);

    const toggleMenu = () => {
        setMenuOpened(!menuOpened);
    };

    useEffect(() => {
        const handleScroll = () => {
            window.scrollY > 40 ? setHeader(true) : setHeader(false);
        };

        // Додаємо слухач події scroll
        window.addEventListener("scroll", handleScroll);

        // Видаляємо слухач події scroll при видаленні компонента
        return () => window.removeEventListener("scroll", handleScroll);
    }, []); // Порожній масив залежностей означає, що useEffect виконається лише один раз

    return (
        <header className={`${header ? "!py-3 shadow-sm" : ""} fixed w-full top-0 left-0 right-0 py-4 z-30 transition-all bg-[#fcfaf4]`}>
            <div className="max-padd-container">
                <div className="flexBetween">
                    {/* Ліва частина (навігація) */}
                    <div className="flex-1 flexStart">
                        <Navbar containerStyles={"hidden md:flex gap-x-5 xl:gap-x-10 medium-15"} />
                    </div>

                    {/* Логотип по центру */}
                    <div className="flex-1 flexCenter">
                        <Link to={"/"}>
                            <h1 className="text-[30px] font-bold text-center" style={{ fontFamily: "'Labrada', serif" }}>
                                GARDA
                            </h1>
                        </Link>
                    </div>

                    {/* Права частина (іконки) */}
                    <div className="flex-1 flexEnd">
                        <div className="flexBetween gap-x-3 sm:gap-x-8">
                            {/* Кнопка меню (відображається лише на мобільних пристроях) */}
                            {!menuOpened ? (
                                <MdMenu onClick={toggleMenu} className="md:hidden cursor-pointer hover:text-secondary text-2xl" />
                            ) : (
                                <MdClose onClick={toggleMenu} className="md:hidden cursor-pointer hover:text-secondary text-2xl" />
                            )}

                            {/* Іконка кошика */}
                            <Link to={"/cart"} className="flex relative">
                                <GiShoppingBag className="text-[22px] text-white bg-secondary h-9 w-9 p-2 rounded-xl" />
                                <span className="bg-white text-sm absolute -top-2 -right-3 flexCenter w-5 h-5 rounded-full shadow-md">0</span>
                            </Link>

                            {/* Іконка профілю */}
                            {!token ? (
                                <button className="btn-outline rounded-full">Login</button>
                            ) : (
                                <div className="group relative">
                                    <FaCircleUser className="text-2xl cursor-pointer" /> {/* Додано cursor-pointer для кращої UX */}
                                    <ul className="bg-primary shadow-sm p-3 w-24 ring-1 ring-slate-900/15 rounded absolute right-0 top-8 group-hover:flex flex-col hidden">
                                        <li className="flex items-center gap-x-2 cursor-pointer">
                                            <FiPackage className="text-[19px]" />
                                            <p>Orders</p>
                                        </li>
                                        <hr className="my-2" />
                                        <li className="flex items-center gap-x-2 cursor-pointer">
                                            <TbLogout className="text-[19px]" />
                                            <p>Logout</p>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
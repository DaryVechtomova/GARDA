import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import { MdMenu, MdClose } from "react-icons/md"
import { GiShoppingBag } from "react-icons/gi"

const Header = () => {
    const [menuOpened, setMenuOpened] = useState(false)
    const [header, setHeader] = useState(false)

    const toggleMenu = () => {
        setMenuOpened(!menuOpened)
    }
    return (
        <header className="fixed w-full mx-auto top-0 left-0 right-0 py-4 z-30 transition-all max-padd-container flexBetween ">
            {/* logo */}
            <Link to={"/"}>
                <h1 className="text-[30px] font-bold text-center w-full" style={{ fontFamily: "'Labrada', serif" }}>
                    GARDA
                </h1>
            </Link>
            <div className="flexBetween gap-x-20">
                {/* navbar Desktop */}
                <Navbar containerStyles={"hidden md:flex gap-x-5 xl:gap-x-10 medium 15"} />
                {/* navbar Mobile */}
                <Navbar containerStyles={`${menuOpened ? "flex items-start flex-col gap-y-12 fixed top-20 right-8 p-12 bg-white rounded-3xl shadow-md w-64 medium-16 ring-1 ring-slate-900/5 transition-all duration-300" : "flex items-start flex-col gap-y-12 fixed top-20 p-12 bg-white rounded-3xl shadow-md w-64 medium-16 ring-1 ring-slate-900/5 transition-all duration-300 -right-[100%]"}`} />
                <div>
                    {!menuOpened ? (<MdMenu onClick={toggleMenu} className="md:hidden cursor-pointer hover:text-secondary text-2xl" />) : (<MdClose onClick={toggleMenu} className="md:hidden cursor-pointer hover:text-secondary text-2xl" />)}
                    <Link to={"/cart"}>
                        <GiShoppingBag />
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header
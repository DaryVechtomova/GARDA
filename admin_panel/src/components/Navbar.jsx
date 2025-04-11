import React from "react";
import profile from "../assets/profile.png";

const Navbar = ({ userData, isLoadingUser, onLogout }) => {
    return (
        <div className="print-hide fixed w-full top-0 left-0 right-0 py-4 transition-all bg-[#fcfaf4] border-b border-b-slate-900/10">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4">
                <h1 className="text-[30px] font-bold text-center w-full" style={{ fontFamily: "'Labrada', serif" }}>
                    GARDA
                </h1>
                <img src={profile} alt="profileImg" height={46} width={46} className="rounded-full" />
                <button
                    onClick={onLogout} // Викликаємо передану функцію
                    className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded' // Приклад стилів
                >
                    Вийти
                </button>
            </div>
        </div>
    );
};
// max-padd-container flexBetween py-2
export default Navbar;
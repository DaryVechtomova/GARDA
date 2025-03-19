import React from "react";
import { NavLink } from 'react-router-dom'
import { BsPlusSquare, BsCardList, BsCardChecklist } from "react-icons/bs"
import { FiUsers } from "react-icons/fi";
import { PiInvoice } from "react-icons/pi";
const Sidebar = () => {
    return (
        <div className="w-1/6 min-h-screen border-r  border-r-slate-900/10 fixed left-0 top-16 bg-white">
            <div className="flex flex-col gap-5 pt-4 sm:pt-10 pl-0">
                {/* <NavLink to={"/add"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <BsPlusSquare />
                    <p className="hidden lg:flex">Add Items</p>
                </NavLink> */}

                <NavLink to={"/list-product"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <BsCardList />
                    <p className="hidden lg:flex">Каталог товарів</p>
                </NavLink>

                <NavLink to={"/orders"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <BsCardChecklist />
                    <p className="hidden lg:flex">Замовлення</p>
                </NavLink>
                <NavLink to={"/list-supplier"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <FiUsers />
                    <p className="hidden lg:flex">Постачальники</p>
                </NavLink>

                <NavLink to={"/list-invoice"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <PiInvoice />
                    <p className="hidden lg:flex">Прибуткові накладні</p>
                </NavLink>
            </div>
        </div >
    )
}

export default Sidebar
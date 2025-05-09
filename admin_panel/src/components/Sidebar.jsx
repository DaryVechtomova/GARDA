import React from "react";
import { NavLink } from 'react-router-dom'
import { BsPlusSquare, BsCardList, BsCardChecklist } from "react-icons/bs"
import { FiUsers } from "react-icons/fi";
import { PiInvoice } from "react-icons/pi";
import { GrUserManager } from "react-icons/gr";
import { IoStatsChartOutline } from "react-icons/io5";
import { MdOutlineQueryStats } from "react-icons/md";
const Sidebar = () => {
    return (
        <div className="print-hide w-1/6 min-h-screen border-r border-r-slate-900/10 fixed left-0 top-20 bg-white">
            <div className="flex flex-col gap-5 pt-4 sm:pt-10 pl-0">
                <NavLink
                    to={"/admin_panel"}
                    className={({ isActive }) =>
                        isActive
                            ? "active-link"
                            : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"
                    }
                >
                    {/* <IoStatsChartOutline size={20} /> */}
                    <MdOutlineQueryStats size={20} />
                    <p className="hidden lg:flex">Статистика</p>
                </NavLink>

                <NavLink to={"/admin_panel/list-product"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <BsCardList />
                    <p className="hidden lg:flex">Каталог товарів</p>
                </NavLink>

                <NavLink to={"/admin_panel/orders"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <BsCardChecklist />
                    <p className="hidden lg:flex">Замовлення</p>
                </NavLink>
                <NavLink to={"/admin_panel/list-supplier"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <FiUsers />
                    <p className="hidden lg:flex">Постачальники</p>
                </NavLink>

                <NavLink to={"/admin_panel/list-invoice"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <PiInvoice />
                    <p className="hidden lg:flex">Прибуткові накладні</p>
                </NavLink>

                <NavLink to={"/admin_panel/list-employees"} className={({ isActive }) => isActive ? "active-link" : "flexCenter gap-x-2 cursor-pointer h-10 max-w-60 border border-slate-900/15 !bg-transparent"}>
                    <GrUserManager />
                    <p className="hidden lg:flex">Співробітники</p>
                </NavLink>
            </div>
        </div >
    )
}

export default Sidebar
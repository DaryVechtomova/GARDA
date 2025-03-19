import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { TbEdit } from "react-icons/tb";
import { NavLink } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa6';

function InvoiceList() {
    const url = "http://localhost:4000";
    const [invoices, setInvoices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchInvoices = async () => {
        try {
            const response = await axios.get(`${url}/api/invoices/list-invoice`);
            if (response.data.success) {
                if (response.data.data.length === 0) {
                    toast.info("Накладних ще немає");
                    setInvoices([]);
                } else {
                    setInvoices(response.data.data);
                }
            } else {
                toast.error("Помилка завантаження накладних");
            }
        } catch (error) {
            toast.error("Не вдалося отримати накладні");
        }
    };

    const filterInvoices = (invoices) => {
        let filteredInvoices = invoices;
        if (statusFilter !== 'All') {
            filteredInvoices = filteredInvoices.filter(invoice => invoice.status === statusFilter);
        }
        return filteredInvoices;
    };

    const searchInvoices = (invoices) => {
        if (!searchQuery) return invoices;
        return invoices.filter(invoice =>
            invoice.supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter]);

    const filteredAndSearchedInvoices = searchInvoices(filterInvoices(invoices));

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список прибуткових накладних</h4>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <select
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="All">Всі статуси</option>
                        <option value="active">Активна</option>
                        <option value="canceled">Скасована</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Пошук за постачальником"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />
                    <NavLink to="/add-invoice">
                        <button className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition">
                            Додати накладну
                        </button>
                    </NavLink>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className='p-3 border'>Постачальник</th>
                            <th className='p-3 border'>Дата</th>
                            <th className='p-3 border'>Сума</th>
                            <th className='p-3 border'>Статус</th>
                            <th className='p-3 border w-20'>Деталі</th>
                            <th className='p-3 border w-20'>Редагувати</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSearchedInvoices.map((invoice) => (
                            <tr key={invoice._id}>
                                <td className="p-3 border">{invoice.supplier.companyName}</td>
                                <td className="p-3 border">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                                <td className="p-3 border">{invoice.totalAmount} грн</td>
                                <td className="p-3 border">{invoice.status}</td>
                                <td className="p-3 border text-center">
                                    <NavLink to={`/invoices/details/${invoice._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <FaPlus size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <NavLink to={`/edit-invoice/${invoice._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <TbEdit size={20} />
                                    </NavLink>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default InvoiceList;
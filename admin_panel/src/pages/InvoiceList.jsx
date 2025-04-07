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
                const sortedInvoices = response.data.data.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
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
            invoice.supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const handleCancelInvoice = async (id) => {
        try {
            const response = await axios.post(`${url}/api/invoices/edit-invoice`, {
                id,
                status: "скасована",
            });
            if (response.data.success) {
                toast.success("Накладу скасовано");
                fetchInvoices();
            } else {
                toast.error("Помилка при скасуванні накладної");
            }
        } catch (error) {
            toast.error("Не вдалося скасувати накладну");
        }
    };

    const handleCompleteInvoice = async (id) => {
        try {
            const response = await axios.post(`${url}/api/invoices/complete-invoice`, { id });
            if (response.data.success) {
                toast.success("Накладу виконано та товари додано на склад");
                fetchInvoices();
            } else {
                toast.error(response.data.message || "Помилка при виконанні накладної");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Не вдалося виконати накладну");
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter]);

    const filteredAndSearchedInvoices = searchInvoices(filterInvoices(invoices));

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Список прибуткових накладних</h4>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <select
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="All">Всі статуси</option>
                        <option value="активна">Активна</option>
                        <option value="скасована">Скасована</option>
                        <option value="виконана">Виконана</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Пошук (постачальник або № накладної)"
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
                <div className="overflow-auto max-h-[calc(100vh-238px)]">
                    <table className="w-full border-collapse border border-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className='p-3 border'>№ накладної</th>
                                <th className='p-3 border'>Постачальник</th>
                                <th className='p-3 border'>Дата</th>
                                <th className='p-3 border'>Сума</th>
                                <th className='p-3 border'>Статус</th>
                                <th className='p-3 border w-20'>Деталі</th>
                                <th className='p-3 border w-20'>Редагувати</th>
                                <th className='p-3 border w-20'>Скасувати</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSearchedInvoices.map((invoice) => {
                                const now = new Date();
                                const invoiceDate = new Date(invoice.invoiceDate);
                                const timeDiff = now - invoiceDate;
                                const hoursDiff = timeDiff / (1000 * 60 * 60);
                                const isEditable = hoursDiff <= 24 && invoice.status === "активна";
                                const isCancelable = hoursDiff <= 24 && invoice.status === "активна";

                                return (
                                    <tr key={invoice._id}>
                                        <td className="p-3 border">{invoice.invoiceNumber || 'N/A'}</td>
                                        <td className="p-3 border">{invoice.supplier.companyName}</td>
                                        <td className="p-3 border">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                                        <td className="p-3 border">{invoice.totalAmount} грн</td>
                                        <td className="p-3 border">
                                            {invoice.status === "активна" ? (
                                                <button
                                                    onClick={() => handleCompleteInvoice(invoice._id)}
                                                    className="text-green-600 hover:text-green-800 font-medium"
                                                >
                                                    Активна (завершити)
                                                </button>
                                            ) : (
                                                <span className={invoice.status === "виконана" ? "text-black" : "text-red-600"}>
                                                    {invoice.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 border text-center">
                                            <NavLink to={`/invoices/details/${invoice._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                                <FaPlus size={20} />
                                            </NavLink>
                                        </td>
                                        <td className="p-3 border text-center">
                                            {isEditable ? (
                                                <NavLink to={`/edit-invoice/${invoice._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                                    <TbEdit size={20} />
                                                </NavLink>
                                            ) : (
                                                <span className="text-gray-400 flex justify-center">
                                                    <TbEdit size={20} />
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 border text-center">
                                            {isCancelable ? (
                                                <button
                                                    onClick={() => handleCancelInvoice(invoice._id)}
                                                    className="text-red-500 hover:text-red-700 flex justify-center"
                                                >
                                                    Скасувати
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 flex justify-center">
                                                    Скасувати
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

export default InvoiceList;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { TbTrash, TbEdit } from "react-icons/tb";
import { NavLink } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa6';

function SupplierList() {
    const url = "http://localhost:4000";
    const [suppliers, setSuppliers] = useState([]);
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterProductType, setFilterProductType] = useState('All');
    const [filterCity, setFilterCity] = useState('All'); // Новий стан для фільтрації за містом
    const [searchQuery, setSearchQuery] = useState('');
    const [cities, setCities] = useState([]); // Список міст

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get(`${url}/api/suppliers/list-supplier`);
            if (response.data.success) {
                if (response.data.data.length === 0) {
                    toast.info("Постачальників ще немає");
                    setSuppliers([]);
                } else {
                    setSuppliers(response.data.data);
                    // Отримуємо унікальні міста з бази даних
                    const uniqueCities = [...new Set(response.data.data.map(supplier => supplier.city))];
                    setCities(uniqueCities);
                }
            } else {
                toast.error("Помилка завантаження списку постачальників");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані");
        }
    };

    const removeSupplier = async (supplierId) => {
        try {
            const response = await axios.post(`${url}/api/supplier/remove`, { id: supplierId });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchSuppliers();
            } else {
                toast.error("Помилка при видаленні постачальника");
            }
        } catch (error) {
            toast.error("Не вдалося видалити постачальника");
        }
    };

    const filterSuppliers = (suppliers) => {
        let filteredSuppliers = suppliers;

        // Фільтрація за статусом
        if (filterStatus !== 'All') {
            filteredSuppliers = filteredSuppliers.filter(supplier => supplier.status === filterStatus);
        }

        // Фільтрація за типом продукції
        if (filterProductType !== 'All') {
            filteredSuppliers = filteredSuppliers.filter(supplier => supplier.productType === filterProductType);
        }

        // Фільтрація за містом
        if (filterCity !== 'All') {
            filteredSuppliers = filteredSuppliers.filter(supplier => supplier.city === filterCity);
        }

        return filteredSuppliers;
    };

    const searchSuppliers = (suppliers) => {
        if (!searchQuery) return suppliers;
        return suppliers.filter(supplier =>
            supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    useEffect(() => {
        fetchSuppliers();
    }, [filterStatus, filterProductType, filterCity]); // Оновлюємо список при зміні фільтрів

    const sortedAndFilteredSuppliers = searchSuppliers(filterSuppliers(suppliers));

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список постачальників</h4>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <select
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="All">Всі статуси</option>
                        <option value="активний">Активний</option>
                        <option value="призупинений">Призупинений</option>
                        <option value="завершений">Завершений</option>
                    </select>
                    <select
                        onChange={(e) => setFilterProductType(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="All">Всі типи продукції</option>
                        <option value="одяг">Одяг</option>
                        <option value="взуття">Взуття</option>
                        <option value="аксесуари">Аксесуари</option>
                        <option value="інше">Інше</option>
                    </select>
                    <select
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    >
                        <option value="All">Всі міста</option>
                        {cities.map((city, index) => (
                            <option key={index} value={city}>{city}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Пошук за назвою компанії"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />
                    <NavLink to="/add-supplier">
                        <button className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition">
                            Додати постачальника
                        </button>
                    </NavLink>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className='p-3 border'>Назва компанії</th>
                            <th className='p-3 border'>Контактна особа</th>
                            <th className='p-3 border'>Email</th>
                            <th className='p-3 border'>Телефон</th>
                            <th className='p-3 border'>Тип продукції</th>
                            <th className='p-3 border'>Статус</th>
                            <th className='p-3 border'>Місто</th>
                            <th className='p-3 border w-20'>Деталі</th>
                            <th className='p-3 border w-20'>Редагувати</th>
                            <th className='p-3 border w-20'>Видалити</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredSuppliers.map((supplier) => (
                            <tr key={supplier._id}>
                                <td className="p-3 border">{supplier.companyName}</td>
                                <td className="p-3 border">{supplier.contactPerson}</td>
                                <td className="p-3 border">{supplier.email}</td>
                                <td className="p-3 border">{supplier.phone}</td>
                                <td className="p-3 border">{supplier.productType}</td>
                                <td className="p-3 border">{supplier.status}</td>
                                <td className="p-3 border">{supplier.city}</td>
                                <td className="p-3 border text-center">
                                    <NavLink to={`/suppliers/details/${supplier._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <FaPlus size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <NavLink to={`/edit-supplier/${supplier._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <TbEdit size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <button
                                        onClick={() => removeSupplier(supplier._id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <TbTrash size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default SupplierList;
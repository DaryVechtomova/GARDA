import React from 'react'
import { useState, useEffect } from 'react';
import axios from 'axios'
import { toast } from 'react-toastify';
import { TbTrash, TbEdit } from "react-icons/tb";
import { NavLink } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa6';


function List() {
    const url = "http://localhost:4000";
    const [list, setList] = useState([]);
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchList = async () => {
        try {
            const response = await axios.get(`${url}/api/product/list`);
            if (response.data.success) {
                setList(response.data.data);
            } else {
                toast.error("Помилка завантаження списку товарів");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані");
        }
    };

    const removeProduct = async (productId) => {
        const response = await axios.post(`${url}/api/product/remove`, { id: productId })
        await fetchList()
        if (response.data.success) {
            toast.success(response.data.message)
        } else {
            toast.error("Помилка")
        }
    };

    const sortProducts = (products) => {
        return products.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.price - b.price;
            } else {
                return b.price - a.price;
            }
        });
    };

    const filterProducts = (products) => {
        if (filterCategory === 'All') return products;
        return products.filter(product => product.category === filterCategory);
    };

    const searchProducts = (products) => {
        if (!searchQuery) return products;
        return products.filter(product =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    useEffect(() => {
        fetchList();
    }, [filterCategory]);

    const sortedAndFilteredProducts = searchProducts(filterProducts(sortProducts(list)));

    return (
        <section className="p-4 w-full bg-primary/20">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список товарів</h4> {/* Надпис нижче */}
                <div className="flex gap-4 mb-4">
                    <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                        Сортувати за ціною {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    <select onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="All">Всі категорії</option>
                        <option value="Для жінок">Для жінок</option>
                        <option value="Для чоловіків">Для чоловіків</option>
                        <option value="Аксесуари">Аксесуари</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Пошук за назвою"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
                    />
                    <NavLink to="/add">
                        <button className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition">Додати товар</button>
                    </NavLink>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className='p-3 border'>Товари</th>
                            <th className='p-3 border w-60 break-words'>Назва</th>
                            <th className='p-3 border'>Ціна</th>
                            <th className='p-3 border'>Категорія</th>
                            <th className='p-3 border'>Кількість</th>
                            <th className='p-3 border'>Деталі</th>
                            <th className='p-3 border w-20'>Редагувати</th>
                            <th className='p-3 border w-20'>Видалити</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredProducts.map((product) => (
                            <tr key={product._id}>
                                <td className="p-3 border flex justify-center items-center">
                                    <img src={`${url}/images/${product.image}`} alt="product" className="h-20 w-20 object-cover shadow-sm" />
                                </td>
                                <td className="p-3 border">{product.name}</td>
                                <td className="p-3 border text-center">{product.price} грн</td>
                                <td className="p-3 border text-center">{product.category}</td>
                                <td className="p-3 border text-center">{product.quantity_in_stock}</td>
                                <td className="p-3 border text-center items-center">
                                    <NavLink to={`/product/details/${product._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <FaPlus />
                                    </NavLink>
                                </td>
                                <td className="p-3 border justify-center items-center">
                                    <NavLink to={`/edit/${product._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <TbEdit size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <div className="flex justify-center">
                                        <TbTrash onClick={() => removeProduct(product._id)} className="text-red-500 hover:text-red-700 cursor-pointer" size={20} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export default List
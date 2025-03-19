import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    const [editingDiscount, setEditingDiscount] = useState(null);
    const [discountValue, setDiscountValue] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false); // Стан для відображення модального вікна
    const [productToDelete, setProductToDelete] = useState(null); // Стан для зберігання ID товару, який користувач намагається видалити

    const fetchList = async () => {
        try {
            const response = await axios.get(`${url}/api/product/list-product`);
            if (response.data.success) {
                if (response.data.data.length === 0) {
                    toast.info("Товарів ще немає");
                    setList([]);
                } else {
                    setList(response.data.data);
                }
            } else {
                toast.error("Помилка завантаження списку товарів");
            }
        } catch (error) {
            toast.error("Не вдалося отримати дані");
        }
    };

    const removeProduct = async (productId) => {
        try {
            const response = await axios.post(`${url}/api/product/remove-product`, { id: productId });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchList();
            } else {
                toast.error("Помилка при видаленні товару");
            }
        } catch (error) {
            toast.error("Не вдалося видалити товар");
        } finally {
            setShowDeleteConfirmation(false); // Закриваємо модальне вікно після видалення
        }
    };

    const removeDiscount = async (productId) => {
        try {
            const response = await axios.delete(`${url}/api/product/discount/remove/${productId}`);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchList();
            } else {
                toast.error("Помилка при видаленні знижки");
            }
        } catch (error) {
            toast.error("Не вдалося видалити знижку");
        }
    };

    const editDiscount = async (productId, discount) => {
        try {
            const response = await axios.put(`${url}/api/product/discount/edit/${productId}`, { discount });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchList();
            } else {
                toast.error("Помилка при редагуванні знижки");
            }
        } catch (error) {
            toast.error("Не вдалося оновити знижку");
        }
    };

    const openEditDiscountModal = (productId, currentDiscount) => {
        setEditingDiscount(productId);
        setDiscountValue(currentDiscount || '');
    };

    const closeEditDiscountModal = () => {
        setEditingDiscount(null);
        setDiscountValue('');
    };

    const saveDiscount = async (productId) => {
        if (discountValue === '' || discountValue < 0 || discountValue > 100) {
            toast.error("Знижка повинна бути від 0 до 100%");
            return;
        }
        await editDiscount(productId, discountValue);
        closeEditDiscountModal();
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

    // Функція для відкриття модального вікна підтвердження видалення
    const handleDeleteClick = (productId) => {
        setProductToDelete(productId);
        setShowDeleteConfirmation(true);
    };

    // Функція для підтвердження видалення
    const confirmDelete = () => {
        if (productToDelete) {
            removeProduct(productToDelete);
        }
    };

    // Функція для скасування видалення
    const cancelDelete = () => {
        setProductToDelete(null);
        setShowDeleteConfirmation(false);
    };

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase mt-4">Список товарів</h4>
                <div className="flex gap-4 mb-4">
                    <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]">
                        Сортувати за ціною {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    <select onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]">
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
                    <NavLink to="/add-product">
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
                            <th className='p-3 border'>Знижка</th>
                            <th className='p-3 border'>Деталі</th>
                            <th className='p-3 border w-20'>Редагувати</th>
                            <th className='p-3 border w-20'>Видалити</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredProducts.map((product) => (
                            <tr key={product._id}>
                                <td className="p-3 border flex justify-center items-center">
                                    {product.images && product.images.length > 0 ? (
                                        <img
                                            src={`${url}/images/${product.images[0]}`}
                                            alt="product"
                                            className="height: 100% w-24 object-cover shadow-sm"
                                        />
                                    ) : (
                                        <span>Немає зображення</span>
                                    )}
                                </td>
                                <td className="p-3 border">{product.name}</td>
                                <td className="p-3 border text-center">
                                    {product.discount ? (
                                        <>
                                            <span className="line-through text-gray-500">{product.price} грн</span>
                                            <br />
                                            <span className="text-red-600 font-bold">{product.discountedPrice.toFixed(2)} грн</span>
                                        </>
                                    ) : (
                                        <span>{product.price} грн</span>
                                    )}
                                </td>
                                <td className="p-3 border text-center">{product.category}</td>
                                <td className="p-3 border text-center">
                                    {product.sizes && product.sizes.length > 0 ? (
                                        <ul>
                                            {product.sizes.map((size, index) => (
                                                <li key={index}>
                                                    {size.size}: {size.quantity}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span>Немає розмірів</span>
                                    )}
                                </td>
                                <td className="p-3 border text-center">
                                    {product.discount ? (
                                        <span>{product.discount}%</span>
                                    ) : (
                                        <span>Немає знижки</span>
                                    )}
                                    <div className="flex gap-2 justify-center mt-2">
                                        <button
                                            onClick={() => openEditDiscountModal(product._id, product.discount)}
                                            className="text-blue-500 hover:text-blue-700"
                                        >
                                            <TbEdit size={16} />
                                        </button>
                                        <button
                                            onClick={() => removeDiscount(product._id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <TbTrash size={16} />
                                        </button>
                                    </div>
                                </td>
                                <td className="p-3 border text-center items-center">
                                    <NavLink to={`/product/details/${product._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <FaPlus />
                                    </NavLink>
                                </td>
                                <td className="p-3 border justify-center items-center">
                                    <NavLink to={`/edit-product/${product._id}`} className="text-blue-500 hover:text-blue-700 flex justify-center">
                                        <TbEdit size={20} />
                                    </NavLink>
                                </td>
                                <td className="p-3 border text-center">
                                    <div className="flex justify-center">
                                        <TbTrash
                                            onClick={() => handleDeleteClick(product._id)}
                                            className="text-red-500 hover:text-red-700 cursor-pointer"
                                            size={20}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Модальне вікно для редагування знижки */}
            {editingDiscount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Редагувати знижку</h3>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder="Введіть знижку (0-100%)"
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => saveDiscount(editingDiscount)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                            >
                                Зберегти
                            </button>
                            <button
                                onClick={closeEditDiscountModal}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg"
                            >
                                Скасувати
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальне вікно підтвердження видалення */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg">
                        <h2 className="text-lg font-bold mb-4">Підтвердження видалення</h2>
                        <p>Ви впевнені, що хочете видалити цей товар?</p>
                        <div className="flex justify-end gap-4 mt-4">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Видалити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default List;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa6';
import { NavLink } from 'react-router-dom';

const AddInvoice = () => {
    const url = "http://localhost:4000";
    const [data, setData] = useState({
        supplier: "",
        products: [],
        totalAmount: 0,
        notes: "",
    });
    const [suppliers, setSuppliers] = useState([]); // Список постачальників
    const [products, setProducts] = useState([]); // Список товарів
    const [selectedProducts, setSelectedProducts] = useState([]); // Вибрані товари для накладної
    const [selectedSize, setSelectedSize] = useState(""); // Вибір розміру
    const [pricePerUnit, setPricePerUnit] = useState(0); // Ціна за одиницю (80% від ціни товару)

    // Отримання списку постачальників та товарів
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await axios.get(`${url}/api/suppliers/list-supplier`);
                if (response.data.success) {
                    setSuppliers(response.data.data);
                } else {
                    toast.error("Помилка завантаження списку постачальників");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
            }
        };

        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${url}/api/product/list-product`);
                if (response.data.success) {
                    setProducts(response.data.data);
                } else {
                    toast.error("Помилка завантаження списку товарів");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
            }
        };

        fetchSuppliers();
        fetchProducts();
    }, []);

    // Обробник зміни полів форми
    const onChangeHandler = (event) => {
        const { name, value } = event.target;
        setData((prevData) => ({ ...prevData, [name]: value }));
    };

    // Додавання товару до накладної
    const addProduct = (productId, size, quantity) => {
        if (quantity <= 0) {
            toast.error("Кількість товару не може бути від'ємною або нульовою");
            return;
        }

        const product = products.find((p) => p._id === productId);
        if (!product) return;

        const newProduct = {
            product: productId,
            size,
            quantity: parseInt(quantity),
            pricePerUnit: pricePerUnit, // Використовуємо розраховану ціну
        };

        setSelectedProducts([...selectedProducts, newProduct]);
        setData((prevData) => ({
            ...prevData,
            totalAmount: prevData.totalAmount + newProduct.quantity * newProduct.pricePerUnit,
        }));
    };

    // Видалення товару з накладної
    const removeProduct = (index) => {
        const removedProduct = selectedProducts[index];
        setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
        setData((prevData) => ({
            ...prevData,
            totalAmount: prevData.totalAmount - removedProduct.quantity * removedProduct.pricePerUnit,
        }));
    };

    // Відправка форми
    const onSubmitHandler = async (event) => {
        event.preventDefault();

        if (!data.supplier) {
            toast.error("Будь ласка, оберіть постачальника");
            return;
        }
        if (selectedProducts.length === 0) {
            toast.error("Будь ласка, додайте товари до накладної");
            return;
        }

        const invoiceData = {
            ...data,
            products: selectedProducts,
        };

        try {
            const response = await axios.post(`${url}/api/invoices/add-invoice`, invoiceData);
            if (response.data.success) {
                toast.success(response.data.message);
                // Очищення форми після успішного додавання
                setData({
                    supplier: "",
                    products: [],
                    totalAmount: 0,
                    notes: "",
                });
                setSelectedProducts([]);
                setSelectedSize("");
                setPricePerUnit(0);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            if (error.response) {
                toast.error(error.response.data.message || "Не вдалося додати накладну");
            } else if (error.request) {
                toast.error("Не вдалося отримати відповідь від сервера");
            } else {
                toast.error("Помилка при налаштуванні запиту");
            }
            console.error("Помилка:", error);
        }
    };

    // Отримання доступних розмірів для вибраного товару
    const getAvailableSizes = (productId) => {
        const product = products.find((p) => p._id === productId);
        return product ? product.sizes : [];
    };

    // Оновлення ціни за одиницю при виборі товару
    useEffect(() => {
        if (data.selectedProduct) {
            const product = products.find((p) => p._id === data.selectedProduct);
            if (product) {
                const calculatedPrice = product.price * 0.25; // 80% від ціни товару
                setPricePerUnit(calculatedPrice);
            }
        }
    }, [data.selectedProduct, products]);

    return (
        <section className="p-4 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Додавання прибуткової накладної</h4>

                {/* Поле для вибору постачальника */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Постачальник</p>
                    <select
                        onChange={onChangeHandler}
                        value={data.supplier}
                        name="supplier"
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                    >
                        <option value="">Оберіть постачальника</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier._id} value={supplier._id}>
                                {supplier.companyName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Поле для додавання товарів */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Товари</p>
                    <div className="flex gap-4">
                        <select
                            className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                            onChange={(e) => {
                                const productId = e.target.value;
                                const product = products.find((p) => p._id === productId);
                                if (product) {
                                    setData((prevData) => ({
                                        ...prevData,
                                        selectedProduct: productId,
                                    }));
                                    setSelectedSize(""); // Скидання вибраного розміру
                                }
                            }}
                        >
                            <option value="">Оберіть товар</option>
                            {products.map((product) => (
                                <option key={product._id} value={product._id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="ring-1 ring-slate-900/10 py-1 px-3 outline-none"
                            onChange={(e) => setSelectedSize(e.target.value)}
                            value={selectedSize}
                        >
                            <option value="">Оберіть розмір</option>
                            {data.selectedProduct &&
                                getAvailableSizes(data.selectedProduct).map((size, index) => (
                                    <option key={index} value={size.size}>
                                        {size.size} (Доступно: {size.quantity})
                                    </option>
                                ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Кількість"
                            className="ring-1 ring-slate-900/10 py-1 px-3 outline-none w-32"
                            onChange={(e) => setData((prevData) => ({ ...prevData, selectedQuantity: e.target.value }))}
                        />
                        <input
                            type="number"
                            value={pricePerUnit.toFixed(2)}
                            readOnly
                            className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 w-32"
                            placeholder="Ціна за одиницю"
                        />
                        <button
                            type="button"
                            className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition"
                            onClick={() => {
                                if (data.selectedProduct && selectedSize && data.selectedQuantity) {
                                    addProduct(data.selectedProduct, selectedSize, data.selectedQuantity);
                                }
                            }}
                        >
                            Додати товар
                        </button>
                    </div>
                </div>

                {/* Список вибраних товарів */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Вибрані товари</p>
                    <ul>
                        {selectedProducts.map((item, index) => {
                            const product = products.find((p) => p._id === item.product);
                            return (
                                <li key={index} className="flex justify-between items-center p-2 border-b">
                                    <span>
                                        {product?.name} (Розмір: {item.size}, Кількість: {item.quantity}, Ціна: {item.pricePerUnit} грн)
                                    </span>
                                    <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => removeProduct(index)}
                                    >
                                        Видалити
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Загальна сума */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Загальна сума</p>
                    <input
                        type="number"
                        value={data.totalAmount.toFixed(2)}
                        readOnly
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100"
                    />
                </div>

                {/* Нотатки */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Нотатки</p>
                    <textarea
                        onChange={onChangeHandler}
                        value={data.notes}
                        name="notes"
                        placeholder='Введіть нотатки..'
                        rows={4}
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none resize-none"
                    ></textarea>
                </div>

                {/* Кнопка додавання накладної */}
                <button type='submit' className="bg-[#fbb42c] hover:bg-[#d0882a] font-bold text-black sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaPlus />
                    Додати накладну
                </button>
            </form>
        </section>
    );
};

export default AddInvoice;
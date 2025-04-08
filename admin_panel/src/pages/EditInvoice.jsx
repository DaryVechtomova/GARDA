import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';

const EditInvoice = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({
        supplier: "",
        products: [],
        totalAmount: 0,
        notes: "",
        status: "активна",
    });
    const [suppliers, setSuppliers] = useState([]); // Список постачальників
    const [products, setProducts] = useState([]); // Список товарів
    const [selectedSize, setSelectedSize] = useState(""); // Вибір розміру
    const [pricePerUnit, setPricePerUnit] = useState(0); // Ціна за одиницю (80% від ціни товару)

    // Фільтрація товарів за типом постачальника
    const filteredProducts = useMemo(() => {
        if (!data.supplier) return [];
        const supplier = suppliers.find((s) => s._id === data.supplier);
        if (!supplier) return [];

        let allowedCategories = [];
        if (supplier.productType === "одяг") {
            allowedCategories = ["Для чоловіків", "Для жінок"];
        } else if (supplier.productType === "аксесуари") {
            allowedCategories = ["Аксесуари"];
        } else {
            allowedCategories = ["Інше"];
        }

        return products.filter((product) => allowedCategories.includes(product.category));
    }, [data.supplier, suppliers, products]);

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

        const fetchInvoice = async () => {
            try {
                const response = await axios.get(`${url}/api/invoices/edit-invoice/${id}`);
                if (response.data.success) {
                    setData(response.data.data);
                } else {
                    toast.error("Помилка завантаження накладної");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
                console.error("Помилка:", error);
            }
        };

        fetchSuppliers();
        fetchProducts();
        fetchInvoice();
    }, [id]);

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

        setData((prevData) => ({
            ...prevData,
            products: [...prevData.products, newProduct],
            totalAmount: prevData.totalAmount + newProduct.quantity * newProduct.pricePerUnit,
        }));
    };

    // Видалення товару з накладної
    const removeProduct = (index) => {
        const removedProduct = data.products[index];
        setData((prevData) => ({
            ...prevData,
            products: prevData.products.filter((_, i) => i !== index),
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
        if (data.products.length === 0) {
            toast.error("Будь ласка, додайте товари до накладної");
            return;
        }

        try {
            const response = await axios.post(`${url}/api/invoices/edit-invoice`, {
                id: data._id,
                ...data,
            });
            if (response.data.success) {
                toast.success(response.data.message);
                navigate("/admin_panel/list-invoice");
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Помилка при оновленні накладної");
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
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <form onSubmit={onSubmitHandler} className="flex flex-col gap-y-5">
                <h4 className="bold-22 pb-2 uppercase">Редагування накладної</h4>

                {/* Поле для вибору постачальника */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Постачальник</p>
                    <input
                        value={suppliers.find(s => s._id === data.supplier)?.companyName || ""}
                        readOnly
                        className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100"
                    />
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
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <option key={product._id} value={product._id}>
                                        {product.name}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>Немає товарів для цього постачальника</option>
                            )}
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
                        {data.products.map((item, index) => {
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

                {/* Кнопка збереження змін */}
                <button type='submit' className="btn-dark sm:w-5-12 flexCenter gap-x-2 !py-2 rounded">
                    <FaSave />
                    Зберегти зміни
                </button>
            </form>
        </section>
    );
};

export default EditInvoice;
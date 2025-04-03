import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaPlus, FaTrash } from 'react-icons/fa';

const EditOrder = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editReason, setEditReason] = useState("");
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState(1);

    const editReasons = [
        "Відсутність товару на складі.",
        "Дефект або пошкодження товару.",
        "Зміна доступних розмірів.",
        "Запит покупця.",
        "Технічні збої в системі."
    ];

    // Функція для розрахунку ціни з урахуванням знижки
    const calculateDiscountedPrice = (price, discount) => {
        return discount ? price * (100 - discount) / 100 : price;
    };

    // Функція для розрахунку загальної суми замовлення з урахуванням знижок
    const calculateTotal = (items) => {
        return items
            .filter(item => !item.removed)
            .reduce((total, item) => {
                const itemPrice = calculateDiscountedPrice(item.price, item.discount);
                return total + (itemPrice * item.quantity);
            }, 0);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const orderResponse = await axios.get(`${url}/api/order/edit-order/${id}`);
                if (orderResponse.data.success) {
                    setOrder(orderResponse.data.data);
                } else {
                    toast.error("Помилка завантаження замовлення");
                }

                const productsResponse = await axios.get(`${url}/api/product/list-product`);
                if (productsResponse.data.success) {
                    setProducts(productsResponse.data.data);
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const addProduct = () => {
        if (!selectedProduct || !selectedSize || selectedQuantity <= 0) {
            toast.error("Будь ласка, заповніть всі поля для додавання товару");
            return;
        }

        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        const newItem = {
            productId: product._id,
            name: product.name,
            price: product.price,
            discount: product.discount || 0,
            size: selectedSize,
            quantity: parseInt(selectedQuantity),
            image: product.images[0],
            removed: false,
            // Додаємо поле з ціною з урахуванням знижки
            discountedPrice: calculateDiscountedPrice(product.price, product.discount)
        };

        setOrder(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            amount: calculateTotal([...prev.items, newItem])
        }));

        setSelectedProduct("");
        setSelectedSize("");
        setSelectedQuantity(1);
    };

    const removeProduct = (index) => {
        const updatedItems = [...order.items];
        updatedItems[index].removed = true;

        setOrder(prev => ({
            ...prev,
            items: updatedItems,
            amount: calculateTotal(updatedItems)
        }));
    };

    const restoreProduct = (index) => {
        const updatedItems = [...order.items];
        updatedItems[index].removed = false;

        setOrder(prev => ({
            ...prev,
            items: updatedItems,
            amount: calculateTotal(updatedItems)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!editReason) {
            toast.error("Будь ласка, оберіть причину редагування");
            return;
        }

        try {
            // Готуємо дані для відправки
            const orderData = {
                ...order,
                editReason,
                amount: calculateTotal(order.items)
            };

            const response = await axios.post(`${url}/api/order/edit-order/${id}`, orderData);

            if (response.data.success) {
                toast.success("Замовлення успішно оновлено");
                navigate('/orders');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Помилка при оновленні замовлення");
            console.error(error);
        }
    };

    if (loading) return <div className="p-10 w-full bg-primary/20 pl-[16%]">Завантаження...</div>;
    if (!order) return <div className="p-10 w-full bg-primary/20 pl-[16%]">Замовлення не знайдено</div>;

    return (
        <section className="p-10 w-full bg-primary/20 pl-[16%]">
            <div className="px-4">
                <h4 className="bold-22 pb-2 uppercase">Редагування замовлення №{order.orderNumber}</h4>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Додавання нового товару */}
                    <div className=" p-4 rounded-lg">
                        <h5 className="bold-18 mb-4">Додати товар</h5>
                        <div className="flex flex-wrap gap-4">
                            <select
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                                className="p-2 border rounded flex-1 min-w-[200px]"
                            >
                                <option value="">Оберіть товар</option>
                                {products.map(product => (
                                    <option key={product._id} value={product._id}>
                                        {product.name} ({product.price} грн{product.discount ? `, знижка ${product.discount}%` : ''})
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedSize}
                                onChange={(e) => setSelectedSize(e.target.value)}
                                className="p-2 border rounded flex-1 min-w-[150px]"
                                disabled={!selectedProduct}
                            >
                                <option value="">Оберіть розмір</option>
                                {selectedProduct &&
                                    products.find(p => p._id === selectedProduct)?.sizes?.map(size => (
                                        <option key={size.size} value={size.size}>
                                            {size.size}
                                        </option>
                                    ))}
                            </select>

                            <input
                                type="number"
                                value={selectedQuantity}
                                onChange={(e) => setSelectedQuantity(e.target.value)}
                                min="1"
                                className="p-2 border rounded w-24"
                            />

                            <button
                                type="button"
                                onClick={addProduct}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                            >
                                <FaPlus /> Додати
                            </button>
                        </div>
                    </div>

                    {/* Список товарів */}
                    <div>
                        <h5 className="bold-18 mb-4">Товари у замовленні</h5>
                        <table className="w-full border-collapse border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border">Назва</th>
                                    <th className="p-2 border">Розмір</th>
                                    <th className="p-2 border">Кількість</th>
                                    <th className="p-2 border">Ціна за од.</th>
                                    <th className="p-2 border">Сума</th>
                                    <th className="p-2 border">Дії</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, index) => {
                                    const discountedPrice = calculateDiscountedPrice(item.price, item.discount);
                                    const totalPrice = discountedPrice * item.quantity;

                                    return (
                                        <tr key={index} className={item.removed ? "bg-gray-100 text-gray-400" : ""}>
                                            <td className="p-2 border">{item.name}</td>
                                            <td className="p-2 border text-center">{item.size}</td>
                                            <td className="p-2 border text-center">{item.quantity}</td>
                                            <td className="p-2 border text-center">
                                                {item.discount ? (
                                                    <>
                                                        <span className="line-through text-gray-500">{item.price} грн</span>
                                                        <br />
                                                        <span className="text-red-600 font-bold">{discountedPrice.toFixed(2)} грн</span>
                                                        <br />
                                                        <span className="text-sm text-green-600">-{item.discount}%</span>
                                                    </>
                                                ) : (
                                                    <span>{item.price} грн</span>
                                                )}
                                            </td>
                                            <td className="p-2 border text-center">
                                                {item.discount ? (
                                                    <>
                                                        <span className="line-through text-gray-500">{(item.price * item.quantity).toFixed(2)} грн</span>
                                                        <br />
                                                        <span className="text-red-600 font-bold">{totalPrice.toFixed(2)} грн</span>
                                                    </>
                                                ) : (
                                                    <span>{(item.price * item.quantity).toFixed(2)} грн</span>
                                                )}
                                            </td>
                                            <td className="p-2 border text-center">
                                                {item.removed ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => restoreProduct(index)}
                                                        className="text-green-500 hover:text-green-700"
                                                        title="Відновити"
                                                    >
                                                        Відновити
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeProduct(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title="Видалити"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100">
                                    <td colSpan="4" className="p-2 border text-right font-bold">Загальна сума:</td>
                                    <td className="p-2 border text-center font-bold">
                                        {calculateTotal(order.items).toFixed(2)} грн
                                    </td>
                                    <td className="p-2 border"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Причина редагування */}
                    <div>
                        <label className="block mb-2">Причина редагування</label>
                        <select
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Оберіть причину</option>
                            {editReasons.map((reason, index) => (
                                <option key={index} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Кнопки */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            className="btn-dark sm:w-5-12 flexCenter gap-x-2 !py-2 rounded"
                        >
                            <FaSave /> Зберегти зміни
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default EditOrder;
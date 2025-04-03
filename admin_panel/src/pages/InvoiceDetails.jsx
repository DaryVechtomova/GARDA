import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

function InvoiceDetails() {
    const url = "http://localhost:4000";
    const { id } = useParams(); // Отримуємо ID накладної з URL
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Отримання деталей накладної
    const fetchInvoiceDetails = async () => {
        try {
            const response = await axios.get(`${url}/api/invoices/details/${id}`);
            if (response.data.success) {
                console.log("Отримані дані:", response.data.data); // Додано для перевірки
                setInvoice(response.data.data);
            } else {
                toast.error("Не вдалося завантажити дані накладної");
            }
        } catch (error) {
            toast.error("Помилка при отриманні даних");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoiceDetails();
    }, [id]);

    if (loading) {
        return <div className="p-10 w-full bg-gray-100 flex justify-center">Завантаження...</div>;
    }

    if (!invoice) {
        return <div className="p-10 w-full bg-gray-100 flex justify-center">Дані накладної не знайдено.</div>;
    }

    return (
        <section className="p-10 w-full bg-gray-100 flex justify-center min-h-screen">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <h4 className="text-2xl font-bold text-black border-b pb-3 mb-4 uppercase">Деталі накладної</h4>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Постачальник</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {invoice.supplier.companyName}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Дата створення</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Загальна сума</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {invoice.totalAmount} грн
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Статус</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {invoice.status}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Нотатки</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {invoice.notes || "Нотатки відсутні"}
                        </div>
                    </div>
                </div>

                {/* Список товарів */}
                <div className="mt-6">
                    <h5 className="text-xl font-bold text-black border-b pb-3 mb-4">Товари</h5>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="p-3 border text-left">Назва</th>
                                <th className="p-3 border text-left">Розмір</th>
                                <th className="p-3 border text-left">Кількість</th>
                                <th className="p-3 border text-left">Ціна за одиницю</th>
                                <th className="p-3 border text-left">Загальна вартість</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.products.map((item, index) => {
                                const productTotal = item.quantity * item.pricePerUnit;
                                return (
                                    <tr key={index} className="border-b">
                                        <td className="p-3">{item.product.name}</td>
                                        <td className="p-3">{item.size}</td>
                                        <td className="p-3">{item.quantity}</td>
                                        <td className="p-3">{item.pricePerUnit} грн</td>
                                        <td className="p-3">{productTotal} грн</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Кнопка "Назад" */}
                <div className="mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-md hover:bg-yellow-600 transition"
                    >
                        Назад
                    </button>
                </div>
            </div>
        </section>
    );
}

export default InvoiceDetails;
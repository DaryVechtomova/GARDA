import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/InvoiceDetails.css';
import { FaPrint, FaEdit, FaArrowLeft } from 'react-icons/fa';

function InvoiceDetails() {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchInvoiceDetails = async () => {
        try {
            const response = await axios.get(`${url}/api/invoices/details/${id}`);
            if (response.data.success) {
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
        <section className="p-10 w-full bg-gray-100 flex justify-center min-h-screen print:p-0 print:bg-white print:print-content">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h4 className="text-2xl font-bold text-black uppercase">Деталі накладної</h4>
                        <p className="text-gray-600 mt-1">№ {invoice.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-black">Дата: {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                        <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${invoice.status === 'активна' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'виконана' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {invoice.status}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <h5 className="text-lg font-semibold text-black mb-2">Постачальник</h5>
                        <div className="p-4 rounded-md border border-gray-200">
                            <p className="font-medium">{invoice.supplier.companyName}</p>
                            {invoice.supplier.contactPerson && (
                                <p className="text-black mt-1">Контактна особа: {invoice.supplier.contactPerson}</p>
                            )}
                            {invoice.supplier.phone && (
                                <p className="text-black mt-1">Телефон: {invoice.supplier.phone}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h5 className="text-lg font-semibold text-black mb-2">Загальна інформація</h5>
                        <div className="p-4 rounded-md border border-gray-200">
                            <div className="flex justify-between mb-2">
                                <span className="text-black">Загальна сума:</span>
                                <span className="font-medium">{invoice.totalAmount} грн</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-black">Дата створення:</span>
                                <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="mb-8">
                        <h5 className="text-lg font-semibold text-gray-700 mb-2">Нотатки</h5>
                        <div className="p-4 rounded-md border border-gray-200 whitespace-pre-wrap">
                            {invoice.notes}
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h5 className="text-xl font-bold text-black border-b pb-3 mb-4">Товари</h5>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-3 border text-left">№</th>
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
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3">{item.product.name}</td>
                                            <td className="p-3">{item.size}</td>
                                            <td className="p-3">{item.quantity}</td>
                                            <td className="p-3">{item.pricePerUnit.toFixed(2)} грн</td>
                                            <td className="p-3">{productTotal.toFixed(2)} грн</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-gray-100 font-bold">
                                    <td colSpan="5" className="p-3 text-right">Разом:</td>
                                    <td className="p-3">{invoice.totalAmount.toFixed(2)} грн</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-between mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2 btn-dark text-white font-medium rounded-lg transition no-print flex items-center gap-2"
                    >
                        <FaArrowLeft /> Назад
                    </button>
                    <div className="flex gap-2">
                        {invoice.status === 'активна' && (
                            <button
                                onClick={() => navigate(`/admin_panel/edit-invoice/${invoice._id}`)}
                                className="px-5 py-2 font-medium bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition no-print flex items-center gap-2"
                            >
                                <FaEdit /> Редагувати
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="px-5 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                        >
                            <FaPrint /> Друк
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default InvoiceDetails;
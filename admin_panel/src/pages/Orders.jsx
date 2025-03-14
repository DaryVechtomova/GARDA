import React, { useEffect, useState } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { FaBox } from "react-icons/fa";

function Orders({ url }) {
    const [orders, setOrders] = useState([]);

    const fetchAllOrders = async () => {
        try {
            const response = await axios.get(url + "/api/order/list");
            console.log("Відповідь сервера:", response);
            if (response.data.success) {
                setOrders(response.data.data);
                console.log(response.data.data);
            } else {
                toast.error("Помилка при отриманні замовлень");
            }
        } catch (error) {
            toast.error("Сталася помилка при завантаженні замовлень");
            console.error("Помилка:", error);
        }
    };

    useEffect(() => {
        fetchAllOrders();
    }, []);

    return (
        <section className='max-padd-container pt-20'>
            <div className='py-10'>
                <h4 className='bold-24'>Список замовлень</h4>
                <table className='w-full mt-8'>
                    <thead>
                        <tr className='border-b border-slate-900/20 text-gray-30 regular-14 xs:regular-16 text-start py-12'>
                            <th className='p-1 text-left hidden sm:table-cell'>Package</th>
                            <th className='p-1 text-left'>Order</th>
                            <th className='p-1 text-left'>Items</th>
                            <th className='p-1 text-left'>Price</th>
                            <th className='p-1 text-left'>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, i) => (
                            <tr key={i} className='border-b border-slate-900/20 text-gray-50 p-6 medium-16 text-left'>
                                <td className='p-1 hidden sm:table-cell'>
                                    <FaBox className='text-2xl text-secondary' />
                                </td>
                                <td className='p-1'>
                                    <div className='p-2'>
                                        <p>
                                            {order.items.map((item, index) => {
                                                if (index === order.items.length - 1) {
                                                    return item.name + " x " + item.quantity;
                                                } else {
                                                    return item.name + " x " + item.quantity + ", ";
                                                }
                                            })}
                                        </p>
                                    </div>
                                    <hr className='w-1/2' />
                                    <div>
                                        <h5 className='medium-15'>{order.deliveryDetails.firstName + " " + order.deliveryDetails.lastName}</h5>
                                        <div>
                                            <p>{order.deliveryDetails.street + ", "}</p>
                                            <p>{order.deliveryDetails.city + ", " + order.deliveryDetails.region +
                                                ", " + order.deliveryDetails.country +
                                                ", " + order.deliveryDetails.zipcode}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className='p-1'>${order.amount}</td>
                                <td className='p-1 text-center'>{order.items.length}</td>
                                <td className='p-1'>
                                    <p className='flexCenter gap-x-2'>
                                        <span className='hidden lg:flex'>&#x25cf;</span>
                                        <b>{order.status}</b>
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default Orders;
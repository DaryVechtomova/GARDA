import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

const ProductDetails = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({
        name: "",
        description: "",
        price: "",
        category: "Для жінок",
        threads: "",
        cut: "",
        technique: "",
        fabric: "",
        colors: "",
        images: [],
        sizes: [],
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`${url}/api/product/details/${id}`);
                if (response.data.success) {
                    setData(response.data.data);
                } else {
                    toast.error("Помилка завантаження товару");
                }
            } catch (error) {
                toast.error("Не вдалося отримати дані");
                console.error("Помилка:", error);
            }
        };
        fetchProduct();
    }, [id]);

    const openImageModal = (index) => {
        setSelectedImage(data.images[index]);
        setCurrentImageIndex(index);
    };

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    const navigateImages = (direction) => {
        let newIndex = direction === 'prev'
            ? (currentImageIndex === 0 ? data.images.length - 1 : currentImageIndex - 1)
            : (currentImageIndex === data.images.length - 1 ? 0 : currentImageIndex + 1);
        setSelectedImage(data.images[newIndex]);
        setCurrentImageIndex(newIndex);
    };

    const hasValue = (value) => value !== null && value !== undefined && value !== "";

    return (
        <section className="p-10 w-full bg-gray-100 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <h4 className="text-2xl font-bold text-black border-b pb-3 mb-4 uppercase">Деталі товару</h4>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Зображення</p>
                        <div className="flex gap-2 flex-wrap">
                            {data.images.length > 0 ? (
                                data.images.map((image, index) => (
                                    <img
                                        key={index}
                                        src={`${url}/images/${image}`}
                                        alt={`product-${index}`}
                                        className="h-24 w-24 object-cover rounded-md shadow cursor-pointer hover:opacity-75 transition"
                                        onClick={() => openImageModal(index)}
                                    />
                                ))
                            ) : (
                                <span>Немає зображень</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className='text-lg font-semibold text-black'>Назва</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.name}
                        </div>
                    </div>
                </div>

                {selectedImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                        <div className="relative bg-white p-4 rounded-lg shadow-lg">
                            <img src={`${url}/images/${selectedImage}`} alt="product-large" className="max-w-full max-h-[80vh] rounded-lg" />
                            <button
                                onClick={() => navigateImages('prev')}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => navigateImages('next')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full"
                            >
                                &gt;
                            </button>
                            <button onClick={closeImageModal} className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full">&times;</button>
                        </div>
                    </div>
                )}

                <div className="mt-6 space-y-4">
                    <p className='text-lg font-semibold text-black'>Опис</p>
                    <div className="bg-gray-100 p-3 rounded-md text-gray-700">{data.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                        <p className='text-lg font-semibold text-black'>Категорія</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">{data.category}</div>
                    </div>
                    <div>
                        <p className='text-lg font-semibold text-black'>Ціна</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">{data.price} грн</div>
                    </div>
                </div>

                {/* Додані поля */}
                {hasValue(data.threads) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Нитки</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.threads}
                        </div>
                    </div>
                )}

                {hasValue(data.cut) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Крій</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.cut}
                        </div>
                    </div>
                )}

                {hasValue(data.technique) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Техніка виконання</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.technique}
                        </div>
                    </div>
                )}

                {hasValue(data.fabric) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Тканина</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.fabric}
                        </div>
                    </div>
                )}

                {hasValue(data.colors) && (
                    <div className="mt-6">
                        <p className='text-lg font-semibold text-black'>Колір</p>
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.colors}
                        </div>
                    </div>
                )}

                <div className="mt-6">
                    <p className='text-lg font-semibold text-black'>Розміри</p>
                    {data.sizes.length > 0 ? (
                        <div className="space-y-2">
                            {data.sizes.map((size, index) => (
                                <div key={index} className="flex justify-between bg-gray-100 p-3 rounded-md text-gray-700">
                                    <span>Розмір: {size.size}</span>
                                    <span>Кількість: {size.quantity}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span>Немає розмірів</span>
                    )}
                </div>

                <div className="mt-6">
                    <button onClick={() => navigate(-1)} className="px-5 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-md hover:bg-yellow-600 transition">
                        Назад
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ProductDetails;
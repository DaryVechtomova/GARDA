import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';

const ProductDetails = () => {
    const url = "http://localhost:4000";
    const { id } = useParams();
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
        images: [], // Додано масив зображень
        sizes: [], // Додано масив розмірів
    });

    const [selectedImage, setSelectedImage] = useState(null); // Для відкриття зображення у великому розмірі
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // Для листання зображень

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`${url}/api/product/edit/${id}`);
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

    // Відкриття зображення у великому розмірі
    const openImageModal = (index) => {
        setSelectedImage(data.images[index]);
        setCurrentImageIndex(index);
    };

    // Закриття модального вікна
    const closeImageModal = () => {
        setSelectedImage(null);
    };

    // Листання зображень
    const navigateImages = (direction) => {
        let newIndex;
        if (direction === 'prev') {
            newIndex = currentImageIndex === 0 ? data.images.length - 1 : currentImageIndex - 1;
        } else {
            newIndex = currentImageIndex === data.images.length - 1 ? 0 : currentImageIndex + 1;
        }
        setSelectedImage(data.images[newIndex]);
        setCurrentImageIndex(newIndex);
    };

    return (
        <section className="p-4 sm:p-10 w-full bg-primary/20">
            <div className="flex flex-col gap-y-5 max-w-{555px}">
                <h4 className="bold-22 pb-2 uppercase">Деталі товару</h4>

                {/* Відображення всіх зображень */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Зображення</p>
                    <div className="flex gap-2 flex-wrap">
                        {data.images && data.images.length > 0 ? (
                            data.images.map((image, index) => (
                                <img
                                    key={index}
                                    src={`${url}/images/${image}`}
                                    alt={`product-${index}`}
                                    className="h-20 w-20 object-cover shadow-sm cursor-pointer"
                                    onClick={() => openImageModal(index)}
                                />
                            ))
                        ) : (
                            <span>Немає зображень</span>
                        )}
                    </div>
                </div>

                {/* Модальне вікно для перегляду зображень */}
                {selectedImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                        <div className="relative">
                            <img
                                src={`${url}/images/${selectedImage}`}
                                alt="product-large"
                                className="max-w-full max-h-[90vh]"
                            />
                            <button
                                onClick={() => navigateImages('prev')}
                                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => navigateImages('next')}
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
                            >
                                &gt;
                            </button>
                            <button
                                onClick={closeImageModal}
                                className="absolute top-0 right-0 bg-white p-2 rounded-full shadow-md"
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                )}

                {/* Інформація про товар */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Назва</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.name}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Про товар</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.description}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Категорія</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.category}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Ціна</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.price} грн
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Нитки</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.threads}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Крій</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.cut}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Техніка виконання</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.technique}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Тканина</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.fabric}
                    </div>
                </div>

                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Колір</p>
                    <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                        {data.colors}
                    </div>
                </div>

                {/* Відображення розмірів та кількості */}
                <div className="flex flex-col gap-y-2">
                    <p className='text-base'>Розміри та кількість</p>
                    {data.sizes && data.sizes.length > 0 ? (
                        data.sizes.map((size, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                                    {size.size}
                                </div>
                                <div className="ring-1 ring-slate-900/10 py-1 px-3 outline-none bg-gray-100 rounded">
                                    {size.quantity}
                                </div>
                            </div>
                        ))
                    ) : (
                        <span>Немає розмірів</span>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ProductDetails;
import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

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

    const [reviews, setReviews] = useState([]);
    const [showReviews, setShowReviews] = useState(false);
    const [showHideConfirmation, setShowHideConfirmation] = useState(false);
    const [reviewToHide, setReviewToHide] = useState(null);
    const [userRole, setUserRole] = useState(null);
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
                toast.error("Не вдалося отримати дані товару");
                console.error("Помилка:", error);
            }
        };

        const checkUserRole = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    setUserRole('гость');
                    return;
                }

                const response = await axios.get(`${url}/api/user/check-role`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Помилка при перевірці ролі:", error);
                setUserRole('гость');
            }
        };

        const fetchReviews = async () => {
            try {
                // Чекаємо, поки визначиться userRole
                if (userRole === null) return;

                console.log(userRole);
                const endpoint = userRole === 'адміністратор'
                    ? 'reviews-admin'
                    : 'reviews-user';
                const response = await axios.get(`${url}/api/review/${endpoint}/${id}`);
                if (response.data.success) {
                    setReviews(response.data.data);
                }
            } catch (error) {
                console.error("Помилка при отриманні відгуків:", error);
            }
        };

        // Спочатку перевіряємо роль
        checkUserRole().then(() => {
            // Після перевірки ролі завантажуємо продукт і відгуки
            fetchProduct();
            fetchReviews();
        });

    }, [id, userRole]); // Додаємо userRole до залежностей

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

    const calculateDiscountedPrice = () => {
        if (data.discount > 0) {
            return data.price * (1 - data.discount / 100);
        }
        return data.price;
    };

    const toggleReviews = () => {
        setShowReviews(!showReviews);
    };

    const confirmHideReview = (reviewId) => {
        setReviewToHide(reviewId);
        setShowHideConfirmation(true);
    };

    const cancelHideReview = () => {
        setReviewToHide(null);
        setShowHideConfirmation(false);
    };

    const hideReview = async () => {
        try {
            const response = await axios.delete(`${url}/api/review/${reviewToHide}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data.success) {
                toast.success("Відгук приховано");
                setReviews(reviews.map(review =>
                    review._id === reviewToHide ? { ...review, isVisible: false } : review
                ));
            } else {
                toast.error("Не вдалося приховати відгук");
            }
        } catch (error) {
            toast.error("Помилка сервера");
            console.error("Помилка при приховуванні відгуку:", error);
        }
        setShowHideConfirmation(false);
        setReviewToHide(null);
    };


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
                        <div className="bg-gray-100 p-3 rounded-md text-gray-700">
                            {data.discount > 0 ? (
                                <>
                                    <span className="line-through text-red-500 mr-2">{data.price} грн</span>
                                    <span className="font-bold">{calculateDiscountedPrice().toFixed(2)} грн</span>
                                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                        -{data.discount}%
                                    </span>
                                </>
                            ) : (
                                <span>{data.price} грн</span>
                            )}
                        </div>
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
                {/* Reviews Section */}
                <div className="mt-8">
                    <button
                        onClick={toggleReviews}
                        className="flex items-center justify-between w-full p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                        <span className="font-semibold">Відгуки ({reviews.length})</span>
                        <span>{showReviews ? '▲' : '▼'}</span>
                    </button>

                    {showReviews && (
                        <div className="mt-4 space-y-4">
                            {reviews.length > 0 ? (
                                reviews.map((review) => (
                                    <div
                                        key={review._id}
                                        className={`p-4 rounded-lg ${review.isVisible ? 'bg-white' : 'bg-gray-100'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-bold">
                                                    {review.user?.secondName} {review.user?.firstName}
                                                </h5>
                                                <p className="text-gray-600">{review.user?.email}</p>
                                                <div className="flex items-center mt-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                                {!review.isVisible && (
                                                    <span className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">Приховано</span>
                                                )}
                                                {userRole === 'адміністратор' && review.isVisible && (
                                                    <div className="mt-1">
                                                        <button
                                                            onClick={() => confirmHideReview(review._id)}
                                                            className="text-sm text-red-500 hover:text-red-700"
                                                        >
                                                            Приховати відгук
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-gray-800">{review.comment}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">Немає відгуків для цього товару</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Hide Review Confirmation Modal */}
                {showHideConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-md w-full">
                            <h2 className="text-lg font-bold mb-4">Підтвердження приховування</h2>
                            <p>Ви впевнені, що хочете приховати цей відгук?</p>
                            <div className="flex justify-end gap-4 mt-4">
                                <button
                                    onClick={cancelHideReview}
                                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                                >
                                    Скасувати
                                </button>
                                <button
                                    onClick={hideReview}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                    Приховати
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t">
                    <button onClick={() => navigate(-1)} className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 px-5 py-2 bg-tertiary text-white font-medium rounded-md  transition text-sm">
                        <FaArrowLeft /> Назад
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ProductDetails;
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShopContext } from "../context/ShopContext"; // Припускаємо, що user context теж тут або передається окремо


const ProductComments = ({ productId }) => {
    const { url, token, user } = useContext(ShopContext); // Потрібен URL API та, можливо, токен/інформація про користувача
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Функція для форматування дати (приклад)
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        try {
            return new Date(dateString).toLocaleDateString('uk-UA', options);
        } catch (e) {
            // Якщо дата з бекенду не валідна, спробуємо просто повернути рядок
             // Або повернемо фіктивну дату як у вашому CSS
             if (dateString === "13.04.2025") return "13.04.2025"; // Заглушка як у вашому CSS
             console.warn("Invalid date format received:", dateString);
             return "дд.мм.рррр"; // Або повертаємо плейсхолдер
        }
    };

    // --- Завантаження коментарів ---
    useEffect(() => {
        const fetchComments = async () => {
            if (!productId || !url) return; // Не робити запит без productId або url
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${url}/api/review/reviews-user/${productId}`);
                if (!response.ok) {
                    throw new Error(`Помилка завантаження: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    // Перевіряємо чи data.data це масив перед встановленням стану
                     setComments(data.data);
                 } else if (data.success) {
                     console.warn("API returned success but data is not an array:", data.data);
                     setComments([]); // Встановлюємо порожній масив у випадку неочікуваних даних
                 }
                 else {
                     throw new Error(data.message || 'Не вдалося отримати коментарі');
                }
            } catch (err) {
                console.error("Fetch comments error:", err);
                setError(err.message);
                setComments([]); // Встановлюємо порожній масив при помилці
            } finally {
                setIsLoading(false);
            }
        };

        fetchComments();
    }, [productId, url]); // Залежності useEffect


     // --- Відправка нового коментаря ---
     const handleCommentSubmit = async (event) => {
        event.preventDefault();
        // setSubmitError(null); // Не потрібно

        if (!newComment.trim()) {
            toast.warn("Будь ласка, введіть текст коментаря.");
            return;
        }

        if (!token) {
             toast.error("Ви не авторизовані. Будь ласка, увійдіть, щоб залишити коментар.");
             // Можна додати логіку для редіректу на логін: navigate('/login');
             return;
        }

        const reviewData = {
            productId,
            comment: newComment.trim()
        };

        try {
            const response = await axios.post(
                `${url}/api/review/create`,
                reviewData,
                { headers: { Authorization: `Bearer ${token}` } } // Додаємо хедер авторизації!
            );

            // --- Успішна відповідь (завжди status 2xx) ---
            if (response.data.success) {
                toast.success(response.data.message || "Відгук додано!"); // Використовуємо повідомлення з бекенду

                const createdReview = response.data.data; // Отримуємо дані нового відгуку

                // Перевіряємо, чи є дані користувача (вони мають бути через populate в контролері)
                const displayReview = {
                    ...createdReview,
                    // Якщо populate не спрацював або це перший раз, візьмемо з контексту
                    user: createdReview.user || {
                       _id: user?._id || 'temp_user_id', // Використовуємо ID з відповіді або з контексту
                        firstName: user?.firstName || 'Ви', // Ім'я з контексту
                        secondName: user?.secondName || ''  // Прізвище з контексту
                    }
                 };

                // Оновлюємо стан коментарів, додаючи новий на початок
                setComments(prevComments => [displayReview, ...(Array.isArray(prevComments) ? prevComments : [])]);
                setNewComment(''); // Очищуємо поле вводу

            } else {
                // --- Невдача, але статус 2xx (малоймовірно при правильному API, але про всяк випадок) ---
                toast.error(response.data.message || 'Не вдалося додати відгук.');
            }

        } catch (err) {
             // --- Обробка помилок з axios (статуси 4xx, 5xx або мережеві помилки) ---
            console.error("Submit comment error:", err); // Лог для розробника

            let errorMessage = 'Виникла помилка при відправці коментаря.'; // За замовчуванням

            if (err.response) {
                // Сервер відповів зі статусом помилки (4xx, 5xx)
                console.error("Error Response Data:", err.response.data);
                console.error("Error Response Status:", err.response.status);
                // Перевіряємо, чи є поле message у відповіді сервера
                if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message; // Використовуємо повідомлення з мідлверу/контролера
                } else if (err.response.status === 401) {
                    errorMessage = 'Помилка авторизації. Можливо, потрібно увійти знову.';
                } else if (err.response.status === 403) {
                    errorMessage = 'Доступ заборонено.';
                 } else if (err.response.status === 400) {
                    errorMessage = 'Невірні дані запиту.'; // Додали обробку 400
                 } else {
                    errorMessage = `Помилка сервера (${err.response.status}). Спробуйте пізніше.`;
                }
            } else if (err.request) {
                // Запит було зроблено, але відповідь не отримано (мережа, сервер недоступний)
                errorMessage = 'Не вдалося підключитися до сервера. Перевірте інтернет-з\'єднання.';
            } else {
                // Помилка налаштування запиту на стороні фронтенду
                errorMessage = 'Сталася помилка під час підготовки запиту.';
            }

            toast.error(errorMessage); // Показуємо фінальне повідомлення користувачу
        }
    };


    return (
        <div className="product-comments-section">
            {/* --- Відображення існуючих коментарів --- */}
            {isLoading && <p>Завантаження коментарів...</p>}
            {error && <p className="error-message">Помилка: {error}</p>}
            {!isLoading && !error && comments.length === 0 && (
                 <p className="no-comments-message">Поки що немає коментарів. Будьте першим!</p>
            )}

            {!isLoading && !error && comments.length > 0 && (
                <div className="comment-list">
                    {comments.map((review) => (
                        <div key={review._id} className="comment-item">
                             {/* Використовуємо review.user, який populated */}
                              <p className="comment-author">{`${review.user?.firstName || 'Анонім'} ${review.user?.secondName || ''}`}</p>
                            <p className="comment-text">{review.comment}</p>
                            <p className="comment-date">{formatDate(review.createdAt)}</p>
                            <hr className="comment-divider" /> {/* Розділювач */}
                        </div>
                    ))}
                </div>
            )}

             {/* --- Форма додавання нового коментаря --- */}
            
                 <div className="add-comment-section">
                     <h4 className="add-comment-title">Додати коментар</h4>
                     <form onSubmit={handleCommentSubmit}>
                         <textarea
                            className="comment-input"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Напишіть коментар"
                            rows="4"
                        />
                         
                         <button type="submit" className="submit-comment-button">
                             Надіслати
                        </button>
                    </form>
                 </div>
            
        </div>
    );
};

export default ProductComments;
const Review = require("../models/reviewModel.js");
const User = require("../models/userModel.js");

// Створити новий відгук
const createReview = async (req, res) => {
    try {
        const { productId, comment } = req.body;
        // userId додається мідлвером authMiddleware в req.user
        const userId = req.user?._id; // Додаткова перевірка наявності req.user

        // --- Валідація ---
        if (!productId || !comment || typeof comment !== 'string' || comment.trim() === '') {
            return res.status(400).json({ // 400 Bad Request - невірний запит
                success: false,
                message: 'Необхідно надати ID товару та текст коментаря.'
            });
        }
        if (!userId) {
            // Це не повинно статись, якщо authMiddleware відпрацював, але про всяк випадок
            console.error('UserId not found in req.user in createReview');
            return res.status(401).json({ success: false, message: 'Помилка авторизації.' });
        }

        // --- Створення та збереження ---
        const newReview = new Review({
            product: productId,
            user: userId,
            comment: comment.trim() // Зберігаємо без зайвих пробілів
        });

        await newReview.save();

        const populatedReview = await Review.findById(newReview._id).populate('user', 'firstName secondName');

        res.status(201).json({
            success: true, // Додаємо success: true
            data: populatedReview,   // Надсилаємо створений відгук з даними користувача
            message: "Відгук успішно додано"
        });

    } catch (err) {
        // --- Обробка помилок сервера/БД ---
        console.error('Error creating review:', err); // Логуємо помилку на сервері
        res.status(500).json({ // 500 Internal Server Error
            success: false, // Додаємо success: false
            message: 'Виникла помилка при створенні відгуку. Спробуйте пізніше.'
            // Не надсилаємо err.message на фронтенд напряму з міркувань безпеки
        });
    }
};

// Отримати відгуки по конкретному товару (для адміністратора)
const getReviewsForAdmin = async (req, res) => {
    const { productId } = req.params;

    try {
        const reviews = await Review.find({
            product: productId
        }).populate('user', 'firstName secondName email');

        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: "Не вдалося отримати відгуки" });
    }
};

// Отримати всі відгуки (для комірника та клієнта)
const getReviewsForUser = async (req, res) => {
    const { productId } = req.params;

    try {
        const reviews = await Review.find({
            product: productId,
            isVisible: true
        }).populate('user', 'firstName secondName');

        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: "Не вдалося отримати відгуки" });
    }
};

// Приховати відгук
const deleteReview = async (req, res) => {
    const { reviewId } = req.params;

    try {
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Відгук не знайдено" });
        }

        review.isVisible = false;
        await review.save();

        res.status(200).json({ success: true, message: "Відгук приховано" });
    } catch (error) {
        console.error("Помилка при приховуванні відгуку:", error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

module.exports = { createReview, getReviewsForAdmin, getReviewsForUser, deleteReview };
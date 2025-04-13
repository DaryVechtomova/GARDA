import Review from '../models/reviewModel.js';
import User from '../models/userModel.js';

// Створити новий відгук
const createReview = async (req, res) => {
    try {
        const { productId, comment } = req.body;
        const userId = req.user._id;

        const newReview = new Review({
            product: productId,
            user: userId,
            comment
        });

        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ message: 'Помилка при створенні відгуку', error: err.message });
    }
};

// Отримати відгуки по конкретному товару
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

// Отримати всі відгуки (для адміністратора)
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

export { createReview, getReviewsForAdmin, getReviewsForUser, deleteReview }
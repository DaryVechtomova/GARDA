import Review from '../models/reviewModel.js';

// Створити новий відгук
export const createReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user._id; // Передбачається, що є авторизація

        const newReview = new Review({
            product: productId,
            user: userId,
            rating,
            comment
        });

        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ message: 'Помилка при створенні відгуку', error: err.message });
    }
};

// Отримати відгуки по конкретному товару
export const getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.find({ product: productId, isVisible: true })
            .populate('user', 'firstName secondName');
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: 'Помилка при отриманні відгуків', error: err.message });
    }
};

// Отримати всі відгуки (для адміністратора)
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().populate('product', 'name').populate('user', 'email');
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: 'Помилка при отриманні всіх відгуків', error: err.message });
    }
};

// Видалити (або приховати) відгук
export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        await Review.findByIdAndUpdate(reviewId, { isVisible: false });
        res.json({ message: 'Відгук приховано (soft delete)' });
    } catch (err) {
        res.status(500).json({ message: 'Помилка при видаленні відгуку', error: err.message });
    }
};

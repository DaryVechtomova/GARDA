import express from 'express';
import { createReview, getReviewsByProduct, getAllReviews, deleteReview } from '../controllers/reviewController.js';

import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Користувач залишає відгук
router.post('/', authMiddleware, createReview);

// Показати всі відгуки для одного товару
router.get('/product/:productId', getReviewsByProduct);

// Адміністратор або комірник бачать усі відгуки
router.get('/admin', authMiddleware, adminMiddleware, getAllReviews);

// Адміністратор або комірник приховують відгук
router.delete('/:reviewId', authMiddleware, adminMiddleware, deleteReview);

export default router;

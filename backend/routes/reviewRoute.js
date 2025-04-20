// import express from 'express';
// import { createReview, getReviewsForAdmin, getReviewsForUser, deleteReview } from '../controllers/reviewController.js';

// import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const express = require('express');
const { createReview, getReviewsForAdmin, getReviewsForUser, deleteReview } = require('../controllers/reviewController.js');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.js');

const reviewRouter = express.Router();

// Користувач залишає відгук
reviewRouter.post('/create', authMiddleware, createReview);

reviewRouter.get('/reviews-admin/:productId', authMiddleware, getReviewsForAdmin);

reviewRouter.get('/reviews-user/:productId', getReviewsForUser);

// Адміністратор приховує/показує відгук
reviewRouter.delete('/:reviewId', authMiddleware, adminMiddleware, deleteReview);

// export default reviewRouter;
module.exports = reviewRouter;
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    isVisible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;

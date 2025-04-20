import {
    getReviewsForAdmin,
    deleteReview,
} from '../../reviewController.js';
import Review from '../../../models/reviewModel.js';

jest.mock('../../../models/reviewModel.js');

beforeEach(() => {
    jest.clearAllMocks();
});

// Тести для getReviewsForAdmin
describe('getReviewsForAdmin', () => {
    let mockReq;
    let mockRes;
    const productId = 'product123';

    beforeEach(() => {
        mockReq = { params: { productId } };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
    });

    it('TCRS01- має успішно повернути всі відгуки для товару з повною інформацією користувача', async () => {
        // Arrange
        const mockReviews = [
            { _id: 'r1', product: productId, comment: 'Review 1', user: { _id: 'u1', firstName: 'Іван', secondName: 'Петренко', email: 'ivan@a.com' }, isVisible: true },
            { _id: 'r2', product: productId, comment: 'Review 2', user: { _id: 'u2', firstName: 'Олена', secondName: 'Іванова', email: 'olena@b.com' }, isVisible: false },
        ];
        const mockPopulate = jest.fn().mockResolvedValue(mockReviews);
        Review.find.mockImplementation(() => ({
            populate: mockPopulate,
        }));

        // Act
        await getReviewsForAdmin(mockReq, mockRes);

        // Assert
        expect(Review.find).toHaveBeenCalledWith({ product: productId });
        expect(mockPopulate).toHaveBeenCalledWith('user', 'firstName secondName email');
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockReviews });
    });

    it('TCRS02 - має повернути порожній масив, якщо відгуків немає', async () => {
        // Arrange
        const mockPopulate = jest.fn().mockResolvedValue([]);
        Review.find.mockImplementation(() => ({ populate: mockPopulate }));

        // Act
        await getReviewsForAdmin(mockReq, mockRes);

        // Assert
        expect(Review.find).toHaveBeenCalledWith({ product: productId });
        expect(mockPopulate).toHaveBeenCalledWith('user', 'firstName secondName email');
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('TCRS03 - має повернути 500 при помилці бази даних', async () => {
        // Arrange
        const dbError = new Error('DB Populate Error');
        const mockPopulate = jest.fn().mockRejectedValue(dbError);
        Review.find.mockImplementation(() => ({ populate: mockPopulate }));

        // Act
        await getReviewsForAdmin(mockReq, mockRes);

        // Assert
        expect(Review.find).toHaveBeenCalledWith({ product: productId });
        expect(mockPopulate).toHaveBeenCalledWith('user', 'firstName secondName email');
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Не вдалося отримати відгуки" });
    });
});

// Тести для deleteReview (Hide)
describe('deleteReview (hide)', () => {
    let mockReq;
    let mockRes;
    const reviewId = 'review123';
    let mockReview;
    let mockSave;

    beforeEach(() => {
        mockReq = { params: { reviewId } };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };

        mockSave = jest.fn().mockResolvedValue(true);

        mockReview = {
            _id: reviewId,
            comment: 'Відгук для приховування',
            isVisible: true,
            save: mockSave,
        };

        Review.findById.mockResolvedValue(mockReview);
    });

    it('TCRE01 - має успішно приховати існуючий відгук (встановити isVisible = false)', async () => {
        // Act
        await deleteReview(mockReq, mockRes);

        // Assert
        expect(Review.findById).toHaveBeenCalledWith(reviewId);
        expect(mockReview.isVisible).toBe(false);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Відгук приховано" });
    });

    it('TCRE02 - має повернути 404, якщо відгук не знайдено', async () => {
        // Arrange
        Review.findById.mockResolvedValue(null);

        // Act
        await deleteReview(mockReq, mockRes);

        // Assert
        expect(Review.findById).toHaveBeenCalledWith(reviewId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Відгук не знайдено" });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCRE03 - має повернути 500 при помилці пошуку відгуку (findById)', async () => {
        // Arrange
        const findError = new Error('FindById DB Error');
        Review.findById.mockRejectedValue(findError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Act
        await deleteReview(mockReq, mockRes);

        // Assert
        expect(Review.findById).toHaveBeenCalledWith(reviewId);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(mockSave).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith("Помилка при приховуванні відгуку:", findError);
        consoleSpy.mockRestore();
    });

    it('TCRE04 - має повернути 500 при помилці збереження відгуку (save)', async () => {
        // Arrange
        const saveError = new Error('Save DB Error');
        mockSave.mockRejectedValue(saveError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Act
        await deleteReview(mockReq, mockRes);

        // Assert
        expect(Review.findById).toHaveBeenCalledWith(reviewId);
        expect(mockReview.isVisible).toBe(false);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка при приховуванні відгуку:", saveError);
        consoleSpy.mockRestore();
    });
});
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server');
const Review = require('../../../models/reviewModel');
const Product = require('../../../models/productModel');
const User = require('../../../models/userModel');

let adminToken;
let adminUserId;
let userId;
let productId;
let visibleReviewId;
let hiddenReviewId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_reviews';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_reviews';

// Функція для генерації JWT токена
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Reviews)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_reviews') {
        console.warn('Warning: Using fallback JWT secret for tests (Reviews).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Reviews)');
});

beforeEach(async () => {
    // Очищення колекцій
    await Review.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Створення тестового адміністратора
    const saltAdmin = await bcrypt.genSalt(10);
    const hashedPasswordAdmin = await bcrypt.hash('reviewAdminPass', saltAdmin);
    const admin = await User.create({
        firstName: 'ReviewAdmin', secondName: 'Tester', middleName: 'R.',
        email: 'review.admin@test.com', phoneNumber: '777888999',
        password: hashedPasswordAdmin, role: 'адміністратор', isActive: true,
        birthDate: new Date('1993-03-03'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення тестового користувача
    const saltUser = await bcrypt.genSalt(10);
    const hashedPasswordUser = await bcrypt.hash('reviewUserPass', saltUser);
    const user = await User.create({
        firstName: 'ReviewUser', secondName: 'Commenter', middleName: 'C.',
        email: 'review.user@test.com', phoneNumber: '666555444',
        password: hashedPasswordUser, role: 'користувач', isActive: true,
        birthDate: new Date('1995-05-05'),
    });
    userId = user._id;

    // Створення тестового товару
    const product = await Product.create({
        name: 'Товар для Відгуків', description: 'Опис', price: 100, category: 'Кат',
        images: ['rev_img.jpg'], colors: 'сірий'
    });
    productId = product._id;

    // Створення тестових відгуків
    const review1 = await Review.create({ product: productId, user: userId, comment: 'Це видимий відгук', isVisible: true });
    const review2 = await Review.create({ product: productId, user: adminUserId, comment: 'Це прихований відгук', isVisible: false });
    visibleReviewId = review1._id;
    hiddenReviewId = review2._id;
});

// Тести для GET /api/review/reviews-admin/:productId
describe('GET /api/review/reviews-admin/:productId', () => {
    it('TCR01 - має успішно повернути всі відгуки (видимі і приховані) для товару (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/review/reviews-admin/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2); // Очікуємо обидва відгуки
        // Перевіряємо наявність обох відгуків
        expect(response.body.data.some(r => String(r._id) === String(visibleReviewId))).toBe(true);
        expect(response.body.data.some(r => String(r._id) === String(hiddenReviewId))).toBe(true);
        // Перевіряємо populate користувача (має бути email для адміна)
        const review1Data = response.body.data.find(r => String(r._id) === String(visibleReviewId));
        const review2Data = response.body.data.find(r => String(r._id) === String(hiddenReviewId));
        expect(review1Data.user).toBeDefined();
        expect(review1Data.user.firstName).toBe('ReviewUser');
        expect(review1Data.user.email).toBeDefined();
        expect(review2Data.user).toBeDefined();
        expect(review2Data.user.firstName).toBe('ReviewAdmin');
        expect(review2Data.user.email).toBeDefined();
    });

    it('TCR02 - має повернути порожній масив, якщо для товару немає відгуків (200 OK)', async () => {
        const nonExistentProductId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .get(`/api/review/reviews-admin/${nonExistentProductId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).get(`/api/review/reviews-admin/${productId}`);
        expect(response.statusCode).toBe(401);
    });
});


// Тести для DELETE /api/review/:reviewId
describe('DELETE /api/review/:reviewId (Hide Review)', () => {
    it('TCR04 - має успішно приховати видимий відгук (200 OK)', async () => {
        const response = await request(app)
            .delete(`/api/review/${visibleReviewId}`)
            .set('Authorization', `Bearer ${adminToken}`); // Потрібен токен адміна/комірника

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Відгук приховано");

        const hiddenReview = await Review.findById(visibleReviewId);
        expect(hiddenReview).not.toBeNull();
        expect(hiddenReview.isVisible).toBe(false);
    });

    it('TCR04 - має успішно "приховати" вже прихований відгук (без помилки)', async () => {
        // Перевіряємо, що він вже прихований
        const initialHiddenReview = await Review.findById(hiddenReviewId);
        expect(initialHiddenReview.isVisible).toBe(false);

        const response = await request(app)
            .delete(`/api/review/${hiddenReviewId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Відгук приховано");

        // Перевірка в БД (стан не має змінитись)
        const stillHiddenReview = await Review.findById(hiddenReviewId);
        expect(stillHiddenReview).not.toBeNull();
        expect(stillHiddenReview.isVisible).toBe(false);
    });

    it('TCR05 - має повернути 404, якщо ID відгуку не існує', async () => {
        const nonExistentReviewId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .delete(`/api/review/${nonExistentReviewId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Відгук не знайдено");
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).delete(`/api/review/${visibleReviewId}`);
        expect(response.statusCode).toBe(401);
    });

    it('має повернути 403, якщо токен звичайного користувача', async () => {
        const userToken = generateToken(userId, 'користувач'); // Токен звичайного користувача
        const response = await request(app)
            .delete(`/api/review/${visibleReviewId}`)
            .set('Authorization', `Bearer ${userToken}`); // Використовуємо токен користувача

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Доступ заборонено"); // Перевірка повідомлення від adminMiddleware
    });
});
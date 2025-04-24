const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Імпорт Express app
const Review = require('../../../models/reviewModel');
const Product = require('../../../models/productModel');
const User = require('../../../models/userModel');

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken; // Адмін і Комірник (для прав доступу)
let adminUserId, nonAdminUserId;
let userId; // Звичайний користувач
let productId; // ID товару
let visibleReviewId, hiddenReviewId; // ID відгуків
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_reviews_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_reviews_sys';

// Функції-хелпери
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Reviews System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_reviews_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Reviews System).');
    }
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    await mongoose.connection.close();
    console.log('Test DB connection closed (Reviews System)');
});

beforeEach(async () => {


    // Створення адміна
    const adminPassword = await hashPassword('SysRevAdminPass');
    const admin = await User.create({
        firstName: 'SysRevAdmin', secondName: 'Rev', middleName: 'R',
        email: 'sysrevadmin@test.com', phoneNumber: '9090909090',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1986-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення Комірника (для NFR03)
    const nonAdminPassword = await hashPassword('SysRevNonAdminPass');
    const nonAdmin = await User.create({
        firstName: 'SysRevNonAdmin', secondName: 'Worker', middleName: 'W',
        email: 'sysrevnonadmin@test.com', phoneNumber: '9191919191',
        password: nonAdminPassword, role: 'комірник', isActive: true,
        birthDate: new Date('1993-02-02')
    });
    nonAdminUserId = nonAdmin._id;
    nonAdminToken = generateToken(nonAdminUserId, 'комірник');

    // Створення Звичайного користувача
    const userPassword = await hashPassword('SysRevUserPass');
    const user = await User.create({
        firstName: 'SysRevUser', secondName: 'Commenter', middleName: 'C',
        email: 'sysrevuser@test.com', phoneNumber: '9292929292',
        password: userPassword, role: 'користувач', isActive: true,
        birthDate: new Date('2001-03-03')
    });
    userId = user._id;


    // Створення товару
    const product = await Product.create({
        name: 'Review Product Test', description: 'RevDesc', price: 100,
        category: 'RevCat', images: ['rev.jpg'], colors: 'revcolor'
    });
    productId = product._id;

    // Створення відгуків
    const reviewVisible = await Review.create({ product: productId, user: userId, comment: 'Гарний товар!', isVisible: true });
    const reviewHidden = await Review.create({ product: productId, user: adminUserId, comment: 'Сумнівний коментар', isVisible: false });
    visibleReviewId = reviewVisible._id;
    hiddenReviewId = reviewHidden._id;
});

// Системні Тести для Review Controller (Admin)

describe('Системне тестування: Адміністратор - Управління відгуками', () => {

    // --- Сценарій: Перегляд відгуків Адміністратором (FR029) ---
    describe('Сценарій: Перегляд відгуків Адміністратором', () => {
        test('Крок 1 (FR029): Отримання всіх відгуків (видимих та прихованих)', async () => {
            const response = await request(app)
                .get(`/api/review/reviews-admin/${productId}`)
                .set('Authorization', `Bearer ${adminToken}`); // Потрібен будь-який авторизований користувач

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(2); // Обидва відгуки

            // Перевірка наявності та видимості
            const foundVisible = response.body.data.find(r => String(r._id) === String(visibleReviewId));
            const foundHidden = response.body.data.find(r => String(r._id) === String(hiddenReviewId));
            expect(foundVisible).toBeDefined();
            expect(foundHidden).toBeDefined();
            expect(foundVisible.isVisible).toBe(true);
            expect(foundHidden.isVisible).toBe(false);

            // Перевірка populate (має бути email)
            expect(foundVisible.user.email).toBeDefined();
            expect(foundHidden.user.email).toBeDefined();
        });

        test('Крок 2 (FR029 - Негативний): Спроба отримати відгуки для неіснуючого товару', async () => {
            const nonExistentProductId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .get(`/api/review/reviews-admin/${nonExistentProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]); // Має повернути порожній масив
        });

        test('Крок 3 (NFR04): Спроба отримати відгуки без авторизації', async () => {
            const response = await request(app)
                .get(`/api/review/reviews-admin/${productId}`);

            expect(response.statusCode).toBe(401); // Unauthorized
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('необхідно авторизуватися');
        });
    });

    // --- Сценарій: Приховування Відгуку (FR030) ---
    describe('Сценарій: Приховування Відгуку', () => {
        test('Крок 1 (FR030): Успішне приховування видимого відгуку', async () => {
            const response = await request(app)
                .delete(`/api/review/${visibleReviewId}`) // Використовуємо DELETE
                .set('Authorization', `Bearer ${adminToken}`); // Потрібен адмін/комірник

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Відгук приховано");

            // Перевірка в БД
            const reviewAfter = await Review.findById(visibleReviewId);
            expect(reviewAfter).not.toBeNull();
            expect(reviewAfter.isVisible).toBe(false);
        });

        test('Крок 2 (FR030): Спроба приховати вже прихований відгук', async () => {
            const response = await request(app)
                .delete(`/api/review/${hiddenReviewId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200); // Має пройти без помилки
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Відгук приховано");

            const reviewAfter = await Review.findById(hiddenReviewId);
            expect(reviewAfter.isVisible).toBe(false); // Залишається прихованим
        });

        test('Крок 3 (FR030 - Негативний): Спроба приховати неіснуючий відгук', async () => {
            const nonExistentReviewId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .delete(`/api/review/${nonExistentReviewId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(404); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Відгук не знайдено");
        });

        test('Крок 4 (NFR03): Комірник МОЖЕ приховувати відгук', async () => {
            const response = await request(app)
                .delete(`/api/review/${visibleReviewId}`)
                .set('Authorization', `Bearer ${nonAdminToken}`); // Токен комірника

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const reviewAfter = await Review.findById(visibleReviewId);
            expect(reviewAfter.isVisible).toBe(false);
        });

        test('Крок 5 (NFR03): Звичайний користувач НЕ МОЖЕ приховувати відгук', async () => {
            const userToken = generateToken(userId, 'користувач');
            const response = await request(app)
                .delete(`/api/review/${visibleReviewId}`)
                .set('Authorization', `Bearer ${userToken}`); // Токен користувача

            expect(response.statusCode).toBe(403); // Forbidden (через adminMiddleware)
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Доступ заборонено");
        });
    });

    // --- Сценарій: Взаємодія Приховування та Отримання (FR029, FR030) ---
    describe('Сценарій: Взаємодія Приховування та Отримання', () => {
        let testProductId;
        let testVisibleReviewId;
        let testHiddenReviewId;
        let testUserToken;

        // Створюємо окремі тестові дані для цього сценарію
        beforeAll(async () => {
            // Створюємо окремий товар для тестів
            const product = await Product.create({
                name: 'Interaction Test Product',
                description: 'Test',
                price: 200,
                category: 'Test',
                images: ['test.jpg'],
                colors: 'test'
            });
            testProductId = product._id;

            // Створюємо тестові відгуки
            const visibleReview = await Review.create({
                product: testProductId,
                user: userId,
                comment: 'Видимий відгук для тестів',
                isVisible: true
            });
            testVisibleReviewId = visibleReview._id;

            const hiddenReview = await Review.create({
                product: testProductId,
                user: userId,
                comment: 'Прихований відгук для тестів',
                isVisible: false
            });
            testHiddenReviewId = hiddenReview._id;

            // Токен звичайного користувача
            testUserToken = generateToken(userId, 'користувач');
        });

        test('Крок 1: Отримати всі (2) відгуки адміном', async () => {
            const response = await request(app)
                .get(`/api/review/reviews-admin/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        test('Крок 2: Приховати видимий відгук', async () => {
            const response = await request(app)
                .delete(`/api/review/${testVisibleReviewId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Відгук приховано");

            // Перевіряємо в БД
            const updatedReview = await Review.findById(testVisibleReviewId);
            expect(updatedReview.isVisible).toBe(false);
        });

        test('Крок 3: Отримати всі (2) відгуки адміном знову (два приховані)', async () => {
            const response = await request(app)
                .get(`/api/review/reviews-admin/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.data).toHaveLength(2);

            // Перевіряємо, що обидва відгуки тепер приховані
            const reviews = response.body.data;
            expect(reviews.every(r => r.isVisible === false)).toBe(true);
        });

        test('Крок 4: Отримати відгуки як користувач (має бути 0)', async () => {
            const response = await request(app)
                .get(`/api/review/reviews-user/${testProductId}`)
                .set('Authorization', `Bearer ${testUserToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        // Очищаємо тестові дані
        afterAll(async () => {
            await Review.deleteMany({ product: testProductId });
            await Product.findByIdAndDelete(testProductId);
        });
    });

});
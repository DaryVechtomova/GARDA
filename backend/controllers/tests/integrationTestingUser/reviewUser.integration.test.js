const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server');
const Review = require('../../../models/reviewModel');
const Product = require('../../../models/productModel');
const User = require('../../../models/userModel');
// Додайте userToken разом з іншими змінними на початку файлу
let userToken;

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

beforeEach(async () => {
    // ... (код очищення та створення даних) ...

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
    // ---- Генеруємо токен для звичайного користувача ----
    userToken = generateToken(userId, 'користувач');

    // ... (решта коду створення продукту та відгуків) ...
});

// ================================================
// ==== Тести для Методів Користувача ==========
// ================================================

// Тести для POST /api/review/create
describe('POST /api/review/create', () => {
    it('TCU01 - має успішно створити новий відгук, коли користувач автентифікований та надає валідні дані (201 Created)', async () => {
        const reviewData = {
            productId: productId.toString(), // Надсилаємо як рядок
            comment: ' Дуже хороший товар! ' // Додамо пробіли для перевірки trim()
        };

        const response = await request(app)
            .post('/api/review/create')
            .set('Authorization', `Bearer ${userToken}`) // Токен звичайного користувача
            .send(reviewData);

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Відгук успішно додано");
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBeDefined();
        expect(response.body.data.comment).toBe('Дуже хороший товар!'); // Перевіряємо trim()
        expect(String(response.body.data.product)).toBe(String(productId)); // productId має збігатись
        expect(response.body.data.user).toBeDefined();
        expect(String(response.body.data.user._id)).toBe(String(userId)); // user._id має збігатись
        expect(response.body.data.user.firstName).toBe('ReviewUser');
        expect(response.body.data.user.secondName).toBe('Commenter');
        expect(response.body.data.user.email).toBeUndefined(); // Email не має бути в populate для користувача

        // Перевірка в базі даних
        const savedReview = await Review.findById(response.body.data._id);
        expect(savedReview).not.toBeNull();
        expect(savedReview.comment).toBe('Дуже хороший товар!');
        expect(String(savedReview.user)).toBe(String(userId));
        expect(savedReview.isVisible).toBe(true); // За замовчуванням isVisible = true
    });

    it('TCU02 - має повернути 400, якщо відсутній productId', async () => {
        const reviewData = {
            comment: 'Немає ID товару'
        };
        const response = await request(app)
            .post('/api/review/create')
            .set('Authorization', `Bearer ${userToken}`)
            .send(reviewData);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Необхідно надати ID товару та текст коментаря.');
    });

    it('TCU03 - має повернути 400, якщо comment відсутній або порожній (лише пробіли)', async () => {
        const reviewDataEmpty = {
            productId: productId.toString(),
            comment: '' // Порожній коментар
        };
        const responseEmpty = await request(app)
            .post('/api/review/create')
            .set('Authorization', `Bearer ${userToken}`)
            .send(reviewDataEmpty);

        expect(responseEmpty.statusCode).toBe(400);
        expect(responseEmpty.body.success).toBe(false);
        expect(responseEmpty.body.message).toBe('Необхідно надати ID товару та текст коментаря.');

        const reviewDataSpaces = {
            productId: productId.toString(),
            comment: '    ' // Коментар з пробілів
        };
        const responseSpaces = await request(app)
            .post('/api/review/create')
            .set('Authorization', `Bearer ${userToken}`)
            .send(reviewDataSpaces);

        expect(responseSpaces.statusCode).toBe(400);
        expect(responseSpaces.body.success).toBe(false);
        expect(responseSpaces.body.message).toBe('Необхідно надати ID товару та текст коментаря.');
    });

    it('TCU04 - має повернути 401, якщо користувач не автентифікований (немає токена)', async () => {
        const reviewData = {
            productId: productId.toString(),
            comment: 'Спроба без токена'
        };
        const response = await request(app)
            .post('/api/review/create')
            // Не встановлюємо 'Authorization' header
            .send(reviewData);

        expect(response.statusCode).toBe(401);
        // Очікуване повідомлення від authMiddleware (може відрізнятися)
        expect(response.body.message).toContain('Для виконання цієї дії необхідно авторизуватися') // Або інше повідомлення залежно від реалізації authMiddleware
           || expect(response.body.message).toContain('Для виконання цієї дії необхідно авторизуватися');
    });

    it('має повернути 401, якщо токен недійсний або неправильний', async () => {
        const reviewData = {
            productId: productId.toString(),
            comment: 'Невалідний токен'
        };
        const response = await request(app)
            .post('/api/review/create')
            .set('Authorization', 'Bearer invalidtoken123') // Невалідний токен
            .send(reviewData);

        expect(response.statusCode).toBe(401);
         // Очікуване повідомлення від authMiddleware при невалідному токені
        expect(response.body.message).toContain('Недійсний токен авторизації.') // Або інше відповідне повідомлення
           || expect(response.body.message).toContain('Недійсний токен авторизації.');
    });
});

// Тести для GET /api/review/reviews-user/:productId
describe('GET /api/review/reviews-user/:productId', () => {
    // У beforeEach вже створені:
    // - видимий відгук (visibleReviewId) від userId
    // - прихований відгук (hiddenReviewId) від adminUserId
    // - ще один товар та видимий відгук для нього (щоб перевірити фільтрацію)

    it('TCU05 - має повернути тільки видимі відгуки для конкретного товару (200 OK)', async () => {
        // Створимо ще один видимий відгук для цього ж товару від іншого користувача
        await Review.create({ product: productId, user: adminUserId, comment: 'Другий видимий відгук', isVisible: true });

        // Також створимо відгук для іншого продукту, щоб перевірити фільтрацію
        const otherProductId = new mongoose.Types.ObjectId();
        await Review.create({ product: otherProductId, user: userId, comment: 'Відгук для іншого товару', isVisible: true });

        const response = await request(app)
            .get(`/api/review/reviews-user/${productId}`); // Не вимагає токена

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2); // Має бути 2 видимих відгуки для цього productId

        // Перевіряємо, що всі повернуті відгуки видимі та належать потрібному товару
        response.body.data.forEach(review => {
            expect(review.isVisible).toBe(true);
            expect(String(review.product)).toBe(String(productId));
            expect(review.comment).not.toBe('Це прихований відгук'); // Переконуємося, що прихованого немає

            // Перевіряємо populate користувача (без email)
            expect(review.user).toBeDefined();
            expect(review.user._id).toBeDefined();
            expect(review.user.firstName).toBeDefined();
            expect(review.user.secondName).toBeDefined();
            expect(review.user.email).toBeUndefined(); // Email не має бути
        });

        // Додатково перевіримо, чи повернувся наш перший видимий відгук
        expect(response.body.data.some(r => String(r._id) === String(visibleReviewId))).toBe(true);
    });

    it('TCU06 - має повернути порожній масив, якщо для товару є тільки приховані відгуки (200 OK)', async () => {
        // Сховаємо всі відгуки для нашого productId
        await Review.updateMany({ product: productId }, { $set: { isVisible: false } });

        const response = await request(app)
            .get(`/api/review/reviews-user/${productId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
    });

    it('TCU07 - має повернути порожній масив, якщо для товару взагалі немає відгуків (200 OK)', async () => {
        const nonExistentProductId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .get(`/api/review/reviews-user/${nonExistentProductId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
    });

    it('має працювати коректно, навіть якщо productId не валідний ObjectId (поверне порожній масив або помилку сервера - залежить від обробки Mongoose)', async () => {
       // mongoose часто обробляє невалідні ID до контролера, але перевіримо
       const invalidProductId = 'not-a-valid-object-id';
        const response = await request(app)
            .get(`/api/review/reviews-user/${invalidProductId}`);

        // Очікувана поведінка тут може різнитись. Mongoose може викинути CastError,
        // який має обробитись як 500 помилка, або контролер може просто не знайти
        // нічого і повернути 200 з порожнім масивом. Залежно від бажаної поведінки
        // змініть очікування. Припускаємо, що він поверне 200 та порожній масив.
        if (response.statusCode === 200) {
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        } else {
            // Або очікуємо помилку валідації/сервера, якщо Mongoose викидає помилку вище
            expect([400, 500]).toContain(response.statusCode);
            // Зазвичай при помилці success буде false
             if(response.body.success !== undefined) {
                expect(response.body.success).toBe(false);
             }
        }
    });
});
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../../../server'); // Шлях до вашого server.js
const User = require('../../../models/userModel');
const Product = require('../../../models/productModel');
const Review = require('../../../models/reviewModel'); // Модель відгуків
const Stripe = require('stripe'); // Хоча Stripe не використовується тут напряму, він може бути потрібен для `app`

// --- ПОЧАТОК: Логіка керування БД та середовищем (дублюється для незалежності файлу) ---
require('dotenv').config({ path: './.env.test' }); // Завантажуємо тестові змінні

const TEST_MONGO_URI = process.env.TEST_MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!TEST_MONGO_URI) {
    console.error("!!! Помилка (review.user.test.js): TEST_MONGO_URI не визначено.");
    process.exit(1);
}
if (!JWT_SECRET) {
     console.error("!!! Помилка (review.user.test.js): JWT_SECRET не визначено.");
     process.exit(1);
}

// Мокаємо Stripe, навіть якщо не використовуємо, щоб уникнути помилок ініціалізації в `app`
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: { sessions: { create: jest.fn().mockResolvedValue({}) } }
    }));
});
// Очищаємо мок перед кожним тестом
beforeEach(() => {
    const stripeInstance = new Stripe();
    if (stripeInstance.checkout?.sessions?.create?.mockClear) {
        stripeInstance.checkout.sessions.create.mockClear();
    }
});
// --- Кінець: Логіка керування БД та середовищем ---


// --- Глобальні змінні для тестів ---
let testUser;        // Основний користувач для створення відгуків
let otherUser;       // Додатковий користувач для різноманітності
let userToken;       // Токен основного користувача
let otherUserToken;  // Токен додаткового користувача
let testProduct1;    // Товар для якого будуть відгуки
let testProduct2;    // Інший товар
let productWithoutReviews; // Товар без відгуків

// --- Допоміжні функції (дублюються або імпортуються) ---
const generateToken = (userId, role = 'користувач') => {
  return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

const createTestUser = async (emailSuffix = Date.now(), role = 'користувач', isActive = true) => {
    const userData = {
        firstName: 'Тест', middleName:'Юзер', secondName: 'Юзер',
        email: `test.user.${emailSuffix}@example.com`,
        password: 'password123', // Пароль не хешуємо для простоти тестів API
        role: role,
        phoneNumber: `+38099123456778`, // Унікальний телефон
        isActive: isActive,
        cartData: {},
    };
    const user = new User(userData);
    await user.save();
    return user;
};


const createTestProducts = async () => {
    const productsData = [
        { // testProduct1
            name: "Товар з Відгуками", description: "Бавовняна футболка", price: 350, discount: 15,
            category: "Одяг",  images: ["images/tshirt.jpg"],  colors: "Blue",
            sizes: [{ size: "M", quantity: 10 }, { size: "L", quantity: 5 }],
            
        },
        { // testProduct2
            name: "Інший Товар", description: "Бігові кросівки", price: 1200,
            category: "Взуття", images: ["images/sneakers.jpg"],  colors: "Blue",
            sizes: [{ size: "42", quantity: 8 }, { size: "43", quantity: 8 }],
            
        },
         { // testProduct3
            name: "Товар без Відгуків", description: "Міський рюкзак", price: 800,
            category: "Аксесуари", images: ["images/backpack.jpg"], colors: "Blue",
            sizes: [{ size: "One Size", quantity: 15 }], // Аксесуари часто мають один розмір
          
        }
    ];
    // Використовуємо Promise.all для паралельного збереження
    const createdProducts = await Product.insertMany(productsData);
    return createdProducts; // Повертаємо масив створених продуктів
};

const createTestReview = async (productId, userId, comment, isVisible = true) => {
    const reviewData = {
        product: productId, user: userId, comment: comment,
        isVisible: isVisible, createdAt: new Date()
    };
    const review = new Review(reviewData);
    await review.save();
    return review;
};


// --- Основний тестовий набір для API Відгуків ---
describe('Review API Endpoints (Client)', () => {

    // --- Хуки для керування БД та основними даними ---
    beforeAll(async () => {
        try {
            // 1. Підключення до БД
            await mongoose.connect(TEST_MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log(`(Review Test) Успішно підключено до тестової БД.`);

            // 2. Створення користувачів
            testUser = await createTestUser('mainReview');
            otherUser = await createTestUser('otherReview');
            userToken = generateToken(testUser._id);
            otherUserToken = generateToken(otherUser._id);

            // 3. Створення продуктів
            const products = await createTestProducts();
            testProduct1 = products[0]; // Товар з Відгуками
            testProduct2 = products[1]; // Інший Товар
            productWithoutReviews = products[2]; // Товар без Відгуків

        } catch (err) {
            console.error(`(Review Test) Критична помилка під час beforeAll:`, err);
            process.exit(1);
        }
    });

    // Очищення *всіх* колекцій після *кожного* тесту
    afterEach(async () => {
        if (mongoose.connection.readyState === 1) {
            const collections = mongoose.connection.collections;
            for (const key in collections) {
                if (!key.startsWith('system.')) {
                    try { await collections[key].deleteMany({}); }
                    catch (error) {
                         if (!error.message.includes("ns not found")) {
                             console.warn(`(Review Test) Помилка очищення ${key}: ${error.message}`);
                         }
                    }
                }
            }
            // Перестворюємо основні дані після очищення
            testUser = await createTestUser('mainReview');
            otherUser = await createTestUser('otherReview');
            userToken = generateToken(testUser._id);
            otherUserToken = generateToken(otherUser._id);
            const products = await createTestProducts();
            testProduct1 = products[0];
            testProduct2 = products[1];
            productWithoutReviews = products[2];
        }
    });

    // Відключення від БД після всіх тестів
    afterAll(async () => {
        try {
            if (mongoose.connection.readyState === 1) { await mongoose.disconnect(); }
            console.log('(Review Test) З\'єднання з тестовою БД закрито.');
        } catch (err) { console.error('(Review Test) Помилка закриття з\'єднання:', err); }
    });
    // --- Кінець хуків ---


    // --- Тести для POST /api/review/create ---
    describe('POST /api/review/create', () => {

        const validReviewData = {
            comment: "Чудовий товар, дуже сподобався!",
        };

        // SYS_CLIENT_REVIEW_001: (Позитивний) Успішне створення відгуку
        it('SYS_CLIENT_REVIEW_001: 201 Created - should successfully create a review by authorized user', async () => {
            const reviewData = {
                ...validReviewData,
                productId: testProduct1._id.toString()
            };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Відгук успішно додано");
            expect(res.body.data._id).toBeDefined();
            expect(res.body.data.product.toString()).toBe(testProduct1._id.toString());
            expect(res.body.data.user._id.toString()).toBe(testUser._id.toString());
            expect(res.body.data.user.firstName).toBe(testUser.firstName);
            expect(res.body.data.user.secondName).toBe(testUser.secondName); // Змінено на lastName
            expect(res.body.data.user.email).toBeUndefined();
            expect(res.body.data.comment).toBe(validReviewData.comment);
            expect(res.body.data.isVisible).toBe(true);

            const reviewInDb = await Review.findById(res.body.data._id);
            expect(reviewInDb).not.toBeNull();
            expect(reviewInDb.comment).toBe(validReviewData.comment);
        });

        // SYS_CLIENT_REVIEW_002: (Негативний) Створення відгуку без поля comment
        it('SYS_CLIENT_REVIEW_002: 400 Bad Request - should fail if comment field is missing', async () => {
            const reviewData = { productId: testProduct1._id.toString() };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Необхідно надати ID товару та текст коментаря.');
            expect(await Review.countDocuments()).toBe(0);
        });

        // SYS_CLIENT_REVIEW_003: (Негативний) Створення відгуку з порожнім comment
        it('SYS_CLIENT_REVIEW_003: 400 Bad Request - should fail if comment is empty or whitespace', async () => {
            const reviewData = { comment: "   ", productId: testProduct1._id.toString() };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Необхідно надати ID товару та текст коментаря.');
            expect(await Review.countDocuments()).toBe(0);
        });

        // SYS_CLIENT_REVIEW_004: (Негативний) Створення відгуку без поля productId
        it('SYS_CLIENT_REVIEW_004: 400 Bad Request - should fail if productId field is missing', async () => {
            const reviewData = { comment: validReviewData.comment };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Необхідно надати ID товару та текст коментаря.');
            expect(await Review.countDocuments()).toBe(0);
        });

        // SYS_CLIENT_REVIEW_005: (Негативний) Створення відгуку до неіснуючого productId
        // Частина 1: Невалідний формат ID
        it('SYS_CLIENT_REVIEW_005 (Part 1): 500 Internal Server Error - should fail if productId has invalid format', async () => {
            const reviewData = { productId: "invalid-id", comment: validReviewData.comment };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Виникла помилка при створенні відгуку. Спробуйте пізніше.');
            expect(await Review.countDocuments()).toBe(0);
        });

        // Частина 2: Валідний формат ID, але товар не існує
        it('SYS_CLIENT_REVIEW_005 (Part 2): 201 Created - should *currently* succeed even if product does not exist', async () => {
            const nonExistentProductId = new mongoose.Types.ObjectId().toString();
            const reviewData = { productId: nonExistentProductId, comment: validReviewData.comment };

            const res = await request(app)
                .post('/api/review/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(reviewData);

            expect(res.statusCode).toBe(201); // Поточна поведінка
            expect(res.body.success).toBe(true);
            expect(res.body.data.product.toString()).toBe(nonExistentProductId);
            expect(await Review.countDocuments()).toBe(1); // Відгук створено
            console.warn(`!!! ПОПЕРЕДЖЕННЯ (SYS_CLIENT_REVIEW_005): Відгук створюється для неіснуючого productId.`);
        });

        // SYS_CLIENT_REVIEW_006: (Безпека/Негативний) Спроба створити відгук без авторизації
        it('SYS_CLIENT_REVIEW_006: 401 Unauthorized - should fail if user is not authenticated', async () => {
            const reviewData = { productId: testProduct1._id.toString(), comment: validReviewData.comment };

            const res = await request(app)
                .post('/api/review/create')
                .send(reviewData); // Без токена

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('необхідно авторизуватися');
            expect(await Review.countDocuments()).toBe(0);
        });
    });


    // --- Тести для GET /api/review/reviews-user/:productId ---
    describe('GET /api/review/reviews-user/:productId', () => {

        let review1_visible, review2_visible, review3_hidden;

        beforeEach(async () => {
            // Створюємо відгуки для testProduct1
            review1_visible = await createTestReview(testProduct1._id, testUser._id, "Перший видимий", true);
            review2_visible = await createTestReview(testProduct1._id, otherUser._id, "Другий видимий від іншого юзера", true);
            review3_hidden = await createTestReview(testProduct1._id, testUser._id, "Третій прихований", false);
        });

        // SYS_CLIENT_REVIEW_007: (Позитивний) Отримання списку видимих відгуків
        it('SYS_CLIENT_REVIEW_007: 200 OK - should return only visible reviews for a product with reviews', async () => {
            const res = await request(app)
                .get(`/api/review/reviews-user/${testProduct1._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(2); // Тільки видимі

            const returnedIds = res.body.data.map(r => r._id.toString());
            expect(returnedIds).toContain(review1_visible._id.toString());
            expect(returnedIds).toContain(review2_visible._id.toString());
            expect(returnedIds).not.toContain(review3_hidden._id.toString());

            // Перевірка полів користувача
            const reviewData = res.body.data.find(r => r._id.toString() === review1_visible._id.toString());
            expect(reviewData.user.firstName).toBe(testUser.firstName);
            expect(reviewData.user.secondName).toBe(testUser.secondName); 
            expect(reviewData.user.email).toBeUndefined();
           
        });

        // SYS_CLIENT_REVIEW_008: (Позитивний) Отримання списку відгуків до товару, де їх немає
        it('SYS_CLIENT_REVIEW_008: 200 OK - should return an empty array for a product with no reviews', async () => {
            const res = await request(app)
                .get(`/api/review/reviews-user/${productWithoutReviews._id}`); // Товар без відгуків

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        // SYS_CLIENT_REVIEW_009: (Позитивний) Отримання списку відгуків, де деякі приховані
        // Цей сценарій повністю покривається тестом SYS_CLIENT_REVIEW_007.
        it('SYS_CLIENT_REVIEW_009: 200 OK - correctly handles products with both visible and hidden reviews (covered by 007)', async () => {
            const res = await request(app)
                .get(`/api/review/reviews-user/${testProduct1._id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(2); // Переконуємось, що прихований не повернувся
        });

        // SYS_CLIENT_REVIEW_010: (Позитивний) Отримання відгуків до неіснуючого productId
        it('SYS_CLIENT_REVIEW_010: 200 OK - should return an empty array for a non-existent productId', async () => {
            const nonExistentProductId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .get(`/api/review/reviews-user/${nonExistentProductId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

         // Додатковий тест: Перевірка, що не потрібна авторизація
        it('200 OK - should allow access without authorization', async () => {
            const res = await request(app)
                .get(`/api/review/reviews-user/${testProduct1._id}`); // Без токена

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(2); // Має повернути видимі
        });
    });

}); // Кінець describe Review API
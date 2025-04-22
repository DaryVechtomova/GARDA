import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../../server.js'; // Переконайся, що шлях правильний
import User from '../../../models/userModel.js'; // Переконайся, що шлях правильний

let server;
let testUserToken; // Токен для тестового користувача
let testUserId; // ID тестового користувача
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_cart'; // Можливо, інша БД для цих тестів? Або та ж
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests';

// --- Помічники ---
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const generateToken = (userId, role) => {
    // У твоєму контролері ти використовуєш req.body.userId, а не дані з токена.
    // Але authMiddleware має *перевірити* токен, тому він все одно потрібен.
    // Я додам userId до токена для загальної практики, але твій контролер його не читає напряму з токена.
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

// Mock item IDs
const ITEM_A_ID = 'itemA_12345';
const ITEM_B_ID = 'itemB_67890';

// --- Налаштування тестів ---
beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    server = app.listen(0); // Запуск на випадковому порту
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests') {
        console.warn('Warning: Using fallback JWT secret for tests. Set JWT_SECRET environment variable.');
    }
});

afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Очищення колекції користувачів перед кожним тестом
    await User.deleteMany({});

    // Створення тестового користувача (не адмін/співробітник)
    const hashedPassword = await hashPassword('testPassword123');
    const user = await User.create({
        firstName: 'Тест',
        secondName: 'Користувач',
        middleName: 'Тестович',
        email: 'test.user@example.com',
        phoneNumber: '9876543210',
        password: hashedPassword,
        role: 'користувач', // Звичайний користувач
        isActive: true,
        birthDate: new Date('1999-12-12'),
        // Початково порожній кошик
        cartData: {},
    });
    testUserId = user._id;
    testUserToken = generateToken(testUserId, 'користувач');
});

// ===============================
// === Тести Cart Controller =====
// ===============================

// --- POST /api/cart/add ---
describe('POST /api/cart/add', () => {
    it('TC_INT_CART_01 - має успішно додати перший товар до кошика (200 OK)', async () => {
        const response = await request(app)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`) // Додаємо токен
            .send({ itemId: ITEM_A_ID, userId: testUserId }); // Надсилаємо ID товару та ID користувача

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Додано до кошика");

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData).toBeDefined();
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(1);
    });

    it('TC_INT_CART_02 - має збільшити кількість існуючого товару в кошику (200 OK)', async () => {
        // Попередньо додаємо товар
        await User.findByIdAndUpdate(testUserId, { cartData: { [ITEM_A_ID]: 1 } });

        const response = await request(app)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(2);
    });

     it('TC_INT_CART_03 - має додати другий, інший товар до кошика (200 OK)', async () => {
        // Попередньо додаємо перший товар
        await User.findByIdAndUpdate(testUserId, { cartData: { [ITEM_A_ID]: 1 } });

        const response = await request(app)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_B_ID, userId: testUserId }); // Додаємо інший товар

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(1); // Перший товар залишився
        expect(updatedUser.cartData[ITEM_B_ID]).toBe(1); // Другий додався
    });

    it('має повернути помилку, якщо userId не існує (200 OK, success: false)', async () => {
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`) // Використовуємо валідний токен, але...
            .send({ itemId: ITEM_A_ID, userId: nonExistentUserId }); // ...надсилаємо невірний userId в тілі

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/cart/add')
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(401); // authMiddleware має це повернути
        // Тіло відповіді залежить від реалізації authMiddleware
        // expect(response.body.success).toBe(false);
    });
});

// --- POST /api/cart/remove ---
describe('POST /api/cart/remove', () => {
    beforeEach(async () => {
        // Додамо товари в кошик для тестів видалення
        await User.findByIdAndUpdate(testUserId, {
            cartData: {
                [ITEM_A_ID]: 2, // Два товари А
                [ITEM_B_ID]: 1  // Один товар B
            }
        });
    });

    it('TC_INT_CART_04 - має успішно зменшити кількість товару (200 OK)', async () => {
        const response = await request(app)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Видалено з кошика");

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(1); // Залишився один
        expect(updatedUser.cartData[ITEM_B_ID]).toBe(1); // Інший не змінився
    });

    it('TC_INT_CART_05 - має встановити кількість товару в 0, якщо видаляється останній (200 OK)', async () => {
        const response = await request(app)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_B_ID, userId: testUserId }); // Видаляємо останній екземпляр товару B

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(2); // Інший не змінився
        expect(updatedUser.cartData[ITEM_B_ID]).toBe(0); // Кількість стала 0
    });

    it('TC_INT_CART_06 - має повернути успіх, навіть якщо намагатись видалити товар, якого немає (200 OK)', async () => {
        const NON_EXISTENT_ITEM_ID = 'non_existent_item_777';
        const response = await request(app)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: NON_EXISTENT_ITEM_ID, userId: testUserId });

        // Поточна логіка контролера повертає успіх, бо if (cartData[itemId] > 0) буде false,
        // і він не змінить дані, але завершиться успішно.
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Видалено з кошика");

        // Перевірка в БД (переконуємось, що інші товари залишились)
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.cartData[ITEM_A_ID]).toBe(2);
        expect(updatedUser.cartData[ITEM_B_ID]).toBe(1);
        expect(updatedUser.cartData[NON_EXISTENT_ITEM_ID]).toBeUndefined(); // Або 0, якщо ключ існував
    });

    it('має повернути помилку, якщо користувача не знайдено (200 OK, success: false)', async () => {
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: nonExistentUserId });

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

     it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/cart/remove')
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(401);
    });

    // Можна додати тест на відсутність itemId, аналогічно до addToCart
});

// --- POST /api/cart/get ---
describe('POST /api/cart/get', () => {
    it('TC_INT_CART_07 - має успішно отримати вміст кошика (200 OK)', async () => {
        // Попередньо наповнимо кошик
        const cartContent = { [ITEM_A_ID]: 3, [ITEM_B_ID]: 1 };
        await User.findByIdAndUpdate(testUserId, { cartData: cartContent });

        const response = await request(app)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUserId }); // Надсилаємо ID користувача

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.cartData).toBeDefined();
        // Використовуємо deep equality для порівняння об'єктів
        expect(response.body.cartData).toEqual(cartContent);
    });

     it('TC_INT_CART_08 - має успішно отримати порожній кошик (200 OK)', async () => {
        // Переконуємось, що кошик порожній (в beforeEach він створюється порожнім)
        const response = await request(app)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.cartData).toBeDefined();
        expect(response.body.cartData).toEqual({}); // Очікуємо порожній об'єкт
    });

    it('має повернути помилку, якщо користувача не знайдено (200 OK, success: false)', async () => {
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: nonExistentUserId });

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/cart/get')
            .send({ userId: testUserId });

        expect(response.statusCode).toBe(401);
    });

     // Можна додати тест на відсутність userId в тілі запиту, якщо це може статись
     it('має повернути помилку, якщо не передано userId в тілі (200 OK, success: false)', async () => {
        // Хоча токен валідний, контролер очікує userId в тілі
        const response = await request(app)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({}); // Порожнє тіло

        // findById(undefined) -> Помилка -> catch
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
     });
});
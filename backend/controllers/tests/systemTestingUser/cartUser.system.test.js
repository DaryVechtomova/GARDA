// controllers/tests/systemTestingUser/cart.system.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken'; // Not strictly needed for cart tests unless checking payload
import { app } from '../../../server.js'; // Ваш експортований app
import userModel from '../../../models/userModel.js'; // Ваша модель користувача
import productModel from '../../../models/productModel.js'; // Ваша модель товару

let server; // Інстанс сервера
let testUser; // Дані тестового користувача з БД
let testUserToken; // JWT токен
let product1; // Тестовий товар 1
let product2; // Тестовий товар 2

// URI та JWT секрет
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_cart'; // Унікальна БД для тестів кошика
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests';

// Базові дані користувача для створення
const baseUserData = {
    firstName: 'Кошик',
    secondName: 'Тестер',
    middleName: 'Клієнтович',
    email: 'cart.tester@example.com',
    phoneNumber: '+380991231212',
    password: 'password123',
    role: 'користувач'
};

// --- Налаштування Тестового Середовища ---

beforeAll(async () => {
    // Перевірка змінних середовища (не кидаємо помилку, якщо локальний fallback)
            if (!process.env.TEST_MONGO_URI && TEST_MONGO_URI.includes('localhost')) {
                console.warn(`Warning: Using fallback local MongoDB URI for tests: ${TEST_MONGO_URI}. Ensure MongoDB is running.`);
            } else if (!process.env.TEST_MONGO_URI) {
                 console.error("ERROR: TEST_MONGO_URI environment variable is not set.");
                 throw new Error("TEST_MONGO_URI environment variable is not set.");
            }
            if (!process.env.JWT_SECRET && JWT_SECRET.includes('fallback')) {
                console.warn('Warning: Using fallback JWT secret for tests. Set JWT_SECRET environment variable.');
            }
        
            // Підключення до MongoDB
            try {
                console.log(`Connecting to Test DB: ${TEST_MONGO_URI.split('@')[0]}...`);
                await mongoose.connect(TEST_MONGO_URI);
                const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'N/A';
                console.log(`Successfully connected to Test DB: ${dbName}`);
                 // Перевірка назви бази даних
                 if (process.env.NODE_ENV === 'test' && !dbName.includes('_test') && !dbName.includes('test')) {
                     console.warn(`!!! WARNING: NODE_ENV=test, but connected to DB '${dbName}'. Ensure this is a test database.`);
                 }
            } catch (err) {
                console.error("Failed to connect to Test DB during beforeAll:", err);
                throw err;
            }

    // Запускаємо сервер
        server = app.listen();
        const address = server.address();
        console.log(`Test server running on port ${address ? address.port : 'N/A'}`);
        if(!address) {
            console.error("Failed to start test server.");
            await mongoose.connection.close();
            throw new Error("Failed to start test server");
        }
});

// Глобальний beforeEach для очищення та створення тестових даних
beforeEach(async () => {
    
        await Promise.all([
            userModel.deleteMany({}),
            productModel.deleteMany({})
        ]);

        // Створення тестових товарів
        [product1, product2] = await Promise.all([
            productModel.create({ name: 'Товар Кошик 1', description: 'Опис класичної вишиванки.', price: 100, category: 'Test', images: ['p1.jpg'], colors: 'Red', sizes: [{size: 'S', quantity: 10}] }),
            productModel.create({ name: 'Товар Кошик 2',  description: 'Опис класичної вишиванки.', price: 250, category: 'Test', images: ['p2.jpg'], colors: 'Blue', sizes: [{size: 'M', quantity: 5}] })
        ]);
        console.log("   Test Cart Data Setup: Created products.");

        // Створення користувача
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(baseUserData.password, salt);
        // Створюємо користувача З ПОРОЖНІМ кошиком одразу
        testUser = await userModel.create({ ...baseUserData, password: hashedPassword, cartData: {} });

        // Логінимося для отримання токена
        const loginRes = await request(server)
            .post('/api/user/login')
            .send({ email: baseUserData.email, password: baseUserData.password });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body).toHaveProperty('token');
        testUserToken = loginRes.body.token;
        console.log(`   Cart Test Setup: Created user ${testUser.email} with empty cart and obtained token.`);

    
});

afterAll(async () => {
     // Зупиняємо сервер
     if (server) {
        console.log('Closing test server...');
        await new Promise(resolve => server.close(resolve));
        console.log('Test server closed.');
     }
    // Закриваємо з'єднання з БД
    try {
        const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'N/A';
        console.log(`Closing connection to Test DB: ${dbName}`);
        if (mongoose.connection.readyState !== 0) {
             await mongoose.connection.close();
             console.log('Test DB connection closed.');
        } else {
            console.log("Test DB connection was already closed or not established.");
        }
    } catch (err) {
        console.error("Error closing Test DB connection:", err);
    }
});

// --- IV. Тести Кошика ---

describe('POST /api/cart/add', () => {

    it('SYS_CLIENT_CART_001: (Позитивний) Додавання першого екземпляра товару до порожнього кошика', async () => {
        // FR01, NFR08
        const res = await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id }) // Надсилаємо userId і itemId
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Додано до кошика');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.cartData).toBeDefined();
        expect(userInDb.cartData[product1._id.toString()]).toBe(1);
    });

    it('SYS_CLIENT_CART_002: (Позитивний) Додавання другого екземпляра того ж товару', async () => {
        // FR01
        // Спочатку додаємо перший екземпляр
        await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id });

        // Додаємо другий
        const res = await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id }) // Той самий itemId
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Додано до кошика');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.cartData[product1._id.toString()]).toBe(2);
    });

    it('SYS_CLIENT_CART_003: (Позитивний) Додавання іншого товару до кошика', async () => {
        // FR01
         // Спочатку додаємо перший товар
        await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id });

        // Додаємо інший товар
        const res = await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product2._id }) // Інший itemId
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Додано до кошика');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.cartData[product1._id.toString()]).toBe(1);
        expect(userInDb.cartData[product2._id.toString()]).toBe(1);
    });


    it('SYS_CLIENT_CART_004: (Негативний) Додавання товару для неіснуючого користувача', async () => {
        // NFR04, NFR06
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${testUserToken}`) // Токен валідний, але userId в тілі неіснуючий
            .send({ userId: nonExistentUserId, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка'); // Помилка при userData.cartData, бо userData буде null
    });


    it('SYS_CLIENT_CART_005: (Безпека/Негативний) Спроба додати до кошика без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/cart/add')
            // Без .set('Authorization', ...)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });
});

describe('POST /api/cart/remove', () => {

     // Функція-хелпер для додавання товару перед тестами видалення
     const addItemToCart = async (itemId, quantity = 1) => {
         for (let i = 0; i < quantity; i++) {
             await request(server)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ userId: testUser._id, itemId: itemId });
         }
         // Перевірка після додавання
         const user = await userModel.findById(testUser._id);
         //console.log(`   Helper: After adding item ${itemId}, cart:`, user.cartData);
     };

    it('SYS_CLIENT_CART_007: (Позитивний) Зменшення кількості товару (було > 1)', async () => {
        // FR02, NFR08
        await addItemToCart(product1._id, 2); // Додаємо товар 1 двічі

        const res = await request(server)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Видалено з кошика');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.cartData[product1._id.toString()]).toBe(1);
    });

    it('SYS_CLIENT_CART_008: (Позитивний) Видалення останнього екземпляра товару (кількість стає 0)', async () => {
        // FR02
         await addItemToCart(product1._id, 1); // Додаємо товар 1 один раз

        const res = await request(server)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Видалено з кошика');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.cartData[product1._id.toString()]).toBe(0);
    });

    it('SYS_CLIENT_CART_009: (Позитивний) Спроба видалити товар, якого вже немає в кошику (кількість 0)', async () => {
        // FR02
         // Кошик порожній спочатку (завдяки beforeEach)

        const res = await request(server)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id }) // Пробуємо видалити товар, якого нема
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Видалено з кошика'); // Контролер не кидає помилку, якщо cartData[itemId] <= 0

        // Перевірка БД (має залишитись порожнім або undefined для цього ID)
        const userInDb = await userModel.findById(testUser._id);
         expect(userInDb.cartData[product1._id.toString()]).toBeUndefined(); // Або .toBe(0), якщо логіка видалення його створить як 0
    });


    it('SYS_CLIENT_CART_010: (Негативний) Видалення товару для неіснуючого користувача', async () => {
        // NFR04, NFR06
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/cart/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: nonExistentUserId, itemId: product1._id })
            .expect(200);

         expect(res.body.success).toBe(false);
         expect(res.body.message).toBe('Помилка'); // Помилка в `userData.cartData`
    });

    it('SYS_CLIENT_CART_011: (Безпека/Негативний) Спроба видалити з кошика без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/cart/remove')
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });
});

describe('POST /api/cart/get', () => {

    // Функція-хелпер для додавання
     const addItemToCart = async (itemId, quantity = 1) => {
         for (let i = 0; i < quantity; i++) {
             await request(server)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ userId: testUser._id, itemId: itemId });
         }
     };

    it('SYS_CLIENT_CART_013: (Позитивний) Отримання порожнього кошика', async () => {
        // FR03, NFR07, NFR08
        // Кошик порожній за замовчуванням після beforeEach

        const res = await request(server)
            .post('/api/cart/get') // Ваш роут використовує POST для getCart
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id }) // Надсилаємо userId, як очікує контролер
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('cartData');
        expect(Object.keys(res.body.cartData).length).toBe(0); // Перевіряємо, що об'єкт порожній
    });

    it('SYS_CLIENT_CART_014: (Позитивний) Отримання кошика з кількома товарами', async () => {
        // FR03, NFR07
        await addItemToCart(product1._id, 2); // Додаємо P1 двічі
        await addItemToCart(product2._id, 1); // Додаємо P2 один раз

        const res = await request(server)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('cartData');
        expect(res.body.cartData[product1._id.toString()]).toBe(2);
        expect(res.body.cartData[product2._id.toString()]).toBe(1);
        expect(Object.keys(res.body.cartData).length).toBe(2);
    });

    it('SYS_CLIENT_CART_015: (Безпека/Негативний) Спроба отримати кошик без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/cart/get')
            .send({ userId: testUser._id }) // Навіть якщо передати ID, токена немає
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });

    it('(Негативний) Отримання кошика для неіснуючого користувача', async () => {
         // NFR06
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/cart/get')
            .set('Authorization', `Bearer ${testUserToken}`) // Токен є, але ID в тілі - невірний
            .send({ userId: nonExistentUserId })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка'); // Помилка в `userData.cartData`
    });
});
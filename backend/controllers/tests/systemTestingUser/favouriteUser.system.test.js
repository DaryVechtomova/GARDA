// controllers/tests/systemTestingUser/favourites.system.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken'; // Not needed directly here
import { app } from '../../../server.js';
import userModel from '../../../models/userModel.js'; // Шлях до моделі користувача
import productModel from '../../../models/productModel.js'; // Шлях до моделі товару

let server; // Інстанс сервера
let testUser; // Дані тестового користувача з БД
let testUserToken; // JWT токен
let product1; // Тестовий товар 1
let product2; // Тестовий товар 2

// URI та JWT секрет
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_favourites'; // Унікальна БД
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests';

// Базові дані користувача
const baseUserData = {
    firstName: 'Улюблене',
    secondName: 'Тестер',
    middleName: 'Клієнт',
    email: 'fav.tester@example.com',
    phoneNumber: '+380994445566',
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
            productModel.create({ name: 'Товар Улюблений 1', description: 'Опис класичної вишиванки.', price: 150, category: 'Test Fav', images: ['pf1.jpg'], colors: 'Green', sizes:[{size:'L', quantity: 1}] }),
            productModel.create({ name: 'Товар Улюблений 2', description: 'Опис класичної вишиванки.', price: 300, category: 'Test Fav', images: ['pf2.jpg'], colors: 'Yellow', sizes:[{size:'M', quantity: 1}] })
        ]);
         console.log("   Test Favourites Data Setup: Created products.");


        // Створення користувача з порожніми улюбленими
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(baseUserData.password, salt);
        // Створюємо користувача З ПОРОЖНІМ списком улюблених одразу
        testUser = await userModel.create({ ...baseUserData, password: hashedPassword, favourites: {} });

        // Логінимося для отримання токена
        const loginRes = await request(server)
            .post('/api/user/login')
            .send({ email: baseUserData.email, password: baseUserData.password });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body).toHaveProperty('token');
        testUserToken = loginRes.body.token;
        console.log(`   Favourites Test Setup: Created user ${testUser.email} with empty favourites and obtained token.`);

   
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


// --- V. Тести Списку Улюблених ---

describe('POST /api/favourite/add', () => {

    it('SYS_CLIENT_FAV_001: (Позитивний) Додавання першого товару до улюблених', async () => {
        // FR04, NFR08
        const res = await request(server)
            .post('/api/favourite/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id }) // Передаємо userId і itemId
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Додано до улюблених');

        // Перевірка БД
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.favourites).toBeDefined();
        expect(userInDb.favourites[product1._id.toString()]).toBe(1);
    });

    it('SYS_CLIENT_FAV_002: (Позитивний) Додавання того ж товару знову (перевірка інкременту)', async () => {
        // FR04 (Перевірка "дивної" логіки)
        // Перше додавання
        await request(server)
            .post('/api/favourite/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id });

        // Друге додавання
        const res = await request(server)
            .post('/api/favourite/add')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Додано до улюблених');

        // Перевірка БД - лічильник має бути 2
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.favourites[product1._id.toString()]).toBe(2);
    });

     it('(Негативний) Додавання для неіснуючого користувача', async () => {
        // NFR04, NFR06
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/favourite/add')
            .set('Authorization', `Bearer ${testUserToken}`) // Токен валідний, ID в тілі - ні
            .send({ userId: nonExistentUserId, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка'); // userData буде null
    });


    it('SYS_CLIENT_FAV_004: (Безпека/Негативний) Спроба додати без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/favourite/add')
            // Без .set('Authorization', ...)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });
});


describe('POST /api/favourite/remove', () => {

     // Функція-хелпер для додавання до улюблених перед тестами видалення
     const addItemToFavourites = async (itemId, times = 1) => {
         for (let i = 0; i < times; i++) {
             await request(server)
                .post('/api/favourite/add')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ userId: testUser._id, itemId: itemId });
         }
         // console.log(`   Helper: Added favourite item ${itemId} ${times} times.`);
     };


    it('SYS_CLIENT_FAV_005: (Позитивний) Зменшення "лічильника" товару (якщо він > 1)', async () => {
        // FR05 (Перевірка "дивної" логіки)
        await addItemToFavourites(product1._id, 2); // Додаємо товар 1 двічі (лічильник 2)

        const res = await request(server)
            .post('/api/favourite/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Видалено з улюблених');

        // Перевірка БД - лічильник має стати 1
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.favourites[product1._id.toString()]).toBe(1);
    });

    it('SYS_CLIENT_FAV_006: (Позитивний) Видалення товару, коли лічильник 1', async () => {
        // FR05
        await addItemToFavourites(product1._id, 1); // Додаємо товар 1 один раз (лічильник 1)

        const res = await request(server)
            .post('/api/favourite/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Видалено з улюблених');

        // Перевірка БД - лічильник має стати 0
        const userInDb = await userModel.findById(testUser._id);
        expect(userInDb.favourites[product1._id.toString()]).toBe(0);
    });

     it('(Позитивний) Спроба видалити товар, коли лічильник вже 0 або товар відсутній', async () => {
        // FR05 (Edge case)
         await addItemToFavourites(product1._id, 1);
         // Видаляємо один раз
        await request(server)
            .post('/api/favourite/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id });

        // Пробуємо видалити ще раз, коли лічильник вже 0
        const res = await request(server)
            .post('/api/favourite/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(200);

         expect(res.body.success).toBe(true); // Помилки не виникає
         expect(res.body.message).toBe('Видалено з улюблених');

         // Перевірка БД - лічильник залишається 0
         const userInDb = await userModel.findById(testUser._id);
         expect(userInDb.favourites[product1._id.toString()]).toBe(0);
    });


   
    it('(Негативний) Видалення для неіснуючого користувача', async () => {
        // NFR04, NFR06
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/favourite/remove')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: nonExistentUserId, itemId: product1._id })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка'); // userData буде null
    });


    it('SYS_CLIENT_FAV_008: (Безпека/Негативний) Спроба видалити без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/favourite/remove')
            .send({ userId: testUser._id, itemId: product1._id })
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });
});


describe('POST /api/favourite/get', () => {

     // Хелпер для додавання
     const addItemToFavourites = async (itemId, times = 1) => {
        // ... (як у попередньому describe)
         for (let i = 0; i < times; i++) {
             await request(server)
                .post('/api/favourite/add')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({ userId: testUser._id, itemId: itemId });
         }
     };

    it('SYS_CLIENT_FAV_009: (Позитивний) Отримання порожнього списку улюблених', async () => {
        // FR06, NFR07, NFR08
        // favourites порожні після beforeEach

        const res = await request(server)
            .post('/api/favourite/get') // POST згідно роутера
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id }) // Надсилаємо userId
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('favourites');
        expect(Object.keys(res.body.favourites).length).toBe(0);
    });

    it('SYS_CLIENT_FAV_010: (Позитивний) Отримання списку з кількома товарами', async () => {
        // FR06, NFR07
        await addItemToFavourites(product1._id, 2); // Додаємо P1 двічі
        await addItemToFavourites(product2._id, 1); // Додаємо P2 один раз

        const res = await request(server)
            .post('/api/favourite/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUser._id })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('favourites');
        expect(res.body.favourites[product1._id.toString()]).toBe(2);
        expect(res.body.favourites[product2._id.toString()]).toBe(1);
        expect(Object.keys(res.body.favourites).length).toBe(2);
    });

    it('(Негативний) Отримання для неіснуючого користувача', async () => {
        // NFR06
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/favourite/get')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: nonExistentUserId })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка'); // userData буде null
    });

    it('(Безпека/Негативний) Спроба отримати список без авторизації', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/favourite/get')
            .send({ userId: testUser._id }) // Токена немає
            .expect(401);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Для виконання цієї дії необхідно авторизуватися|No token provided/i);
    });
});
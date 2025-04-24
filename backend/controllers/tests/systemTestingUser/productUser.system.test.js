// controllers/tests/systemTestingUser/productCatalog.system.test.js
import request from 'supertest';
import mongoose from 'mongoose';
// Не використовуємо bcrypt і jwt для цих тестів, якщо не потрібна авторизація
import { app } from '../../../server.js';
import productModel from '../../../models/productModel.js'; // Шлях до моделі товару

let server; // Інстанс сервера
// Дані для тестових товарів
let product1; // Звичайний товар
let product2; // Товар зі знижкою
let product3; // Товар без наявності (деяких розмірів)

// Визначаємо тестову URI та JWT секрет
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_profile'; // Унікальна БД для тестів профілю
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests';

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
        await productModel.deleteMany({});
     

        // Створення тестових товарів
        product1 = await productModel.create({
            name: 'Тестова Вишиванка Класична',
            description: 'Опис класичної вишиванки.',
            price: 1000,
            discount: 0, // Без знижки
            images: ['image1.jpg', 'image2.jpg'],
            category: 'Вишиванки',
            colors: 'Білий',
            sizes: [
                { size: 'M', quantity: 5 },
                { size: 'L', quantity: 10 }
            ]
        });

        product2 = await productModel.create({
            name: 'Тестова Сукня зі Знижкою',
            description: 'Опис сукні зі знижкою.',
            price: 2000,
            discount: 20, // Знижка 20%
            images: ['dress1.jpg'],
            category: 'Сукні',
            colors: 'Синій',
            sizes: [
                { size: 'S', quantity: 3 },
                { size: 'M', quantity: 0 } // Розмір M не в наявності
            ]
        });

        product3 = await productModel.create({
             name: 'Сорочка Без Наявності',
             description: 'Опис сорочки не в наявності.',
             price: 500,
             discount: 0,
             images: ['shirt1.jpg'],
             category: 'Сорочки',
             colors: 'Чорний',
             sizes: [
                 { size: 'XL', quantity: 0 },
                 { size: 'XXL', quantity: 0 }
             ]
        });

         console.log("   Test Product Data Setup: Created products.");

    
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

// --- III. Тести Перегляду Товарів ---

describe('GET /api/product/list-product', () => {

    it('SYS_CLIENT_PRODUCT_001: (Позитивний) Отримання списку товарів (коли є товари)', async () => {
        // FR19, NFR07, NFR08
        const res = await request(server)
            .get('/api/product/list-product')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(3); // Ми створили 3 товари в beforeEach

        // Перевіряємо наявність discountedPrice і правильність розрахунку для товару зі знижкою
        const product2InData = res.body.data.find(p => p._id === product2._id.toString());
        expect(product2InData).toBeDefined();
        expect(product2InData).toHaveProperty('discountedPrice');
        // Розраховуємо очікувану ціну зі знижкою
        const expectedDiscountedPrice = product2.price * (1 - product2.discount / 100);
        expect(product2InData.discountedPrice).toBeCloseTo(expectedDiscountedPrice); // Використовуємо toBeCloseTo для чисел з плаваючою комою

        // Перевіряємо товар без знижки
        const product1InData = res.body.data.find(p => p._id === product1._id.toString());
        expect(product1InData).toBeDefined();
        expect(product1InData).toHaveProperty('discountedPrice');
        expect(product1InData.discountedPrice).toBe(product1.price); // Ціна має бути без змін
    });

    it('SYS_CLIENT_PRODUCT_002: (Позитивний) Отримання списку товарів (коли товарів немає)', async () => {
        // FR19
        // Очищуємо базу ПІСЛЯ beforeEach, спеціально для цього тесту
        await productModel.deleteMany({});

        const res = await request(server)
            .get('/api/product/list-product')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(0);
    });
});

describe('GET /api/product/details/:id', () => {

    it('SYS_CLIENT_PRODUCT_003: (Позитивний) Отримання деталей існуючого товару', async () => {
        // FR20, NFR08
        const res = await request(server)
            .get(`/api/product/details/${product1._id}`) // Використовуємо ID створеного товару
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.name).toBe(product1.name);
        expect(res.body.data.description).toBe(product1.description);
        expect(res.body.data._id).toBe(product1._id.toString());
    });

    it('SYS_CLIENT_PRODUCT_004: (Негативний) Отримання деталей товару за неіснуючим ID', async () => {
        // FR20, NFR06
        const nonExistentId = new mongoose.Types.ObjectId(); // Генеруємо валідний, але неіснуючий ID
        const res = await request(server)
            .get(`/api/product/details/${nonExistentId}`)
            .expect(200); // Ваш контролер повертає 200 у разі "не знайдено"

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Товар не знайдено');
    });

     it('SYS_CLIENT_PRODUCT_005: (Негативний) Отримання деталей товару за невалідним ID', async () => {
        // FR20, NFR06
        const invalidId = 'this-is-not-an-object-id';
        const res = await request(server)
            .get(`/api/product/details/${invalidId}`)
            .expect(200); // Ваш контролер перехоплює помилку і повертає 200 success: false

        expect(res.body.success).toBe(false);
         // Ваша поточна реалізація не розрізняє неіснуючий і невалідний ID у повідомленні
         // оскільки catch обробляє обидва випадки однаково
        expect(res.body.message).toBe('Помилка при отриманні товару');
    });
});

describe('GET /api/product/list-discounted-products', () => {

    it('SYS_CLIENT_PRODUCT_006: (Позитивний) Отримання списку товарів зі знижкою (коли такі є)', async () => {
        // FR21, NFR07, NFR08
        const res = await request(server)
            .get('/api/product/list-discounted-products')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1); // Тільки product2 має знижку > 0
        expect(res.body.data[0]._id).toBe(product2._id.toString());
        expect(res.body.data[0].discount).toBeGreaterThan(0);
        expect(res.body.data[0]).toHaveProperty('discountedPrice');
        const expectedDiscountedPrice = product2.price * (1 - product2.discount / 100);
        expect(res.body.data[0].discountedPrice).toBeCloseTo(expectedDiscountedPrice);
    });

    it('SYS_CLIENT_PRODUCT_007: (Позитивний) Отримання списку товарів зі знижкою (коли таких немає)', async () => {
        // FR21
        // Видаляємо товар зі знижкою
        await productModel.findByIdAndDelete(product2._id);
        const res = await request(server)
            .get('/api/product/list-discounted-products')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(0);
    });
});

describe('GET /api/product/availability/:id', () => {

    it('SYS_CLIENT_PRODUCT_008: (Позитивний) Перевірка наявності існуючого товару (з розмірами, деякі є)', async () => {
        // FR22, NFR08
        const res = await request(server)
            .get(`/api/product/availability/${product2._id}`) // Товар 2 має розмір S в наявності, M - ні
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.productId).toBe(product2._id.toString());
        expect(res.body.data.name).toBe(product2.name);
        expect(res.body.data.available).toBe(true); // Загальна доступність true, бо хоч один розмір є
        expect(res.body.data).toHaveProperty('details');
        expect(res.body.data.details).toHaveProperty('sizes');
        expect(Array.isArray(res.body.data.details.sizes)).toBe(true);
        expect(res.body.data.details.sizes.length).toBe(2);

        const sizeS = res.body.data.details.sizes.find(s => s.size === 'S');
        const sizeM = res.body.data.details.sizes.find(s => s.size === 'M');

        expect(sizeS).toBeDefined();
        expect(sizeS.available).toBe(true);
        expect(sizeS.quantity).toBe(3);

        expect(sizeM).toBeDefined();
        expect(sizeM.available).toBe(false);
        expect(sizeM.quantity).toBe(0);
    });

    it('SYS_CLIENT_PRODUCT_009: (Позитивний) Перевірка наявності товару, якого немає в наявності', async () => {
        // FR22
        const res = await request(server)
            .get(`/api/product/availability/${product3._id}`) // Товар 3 повністю не в наявності
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.productId).toBe(product3._id.toString());
        expect(res.body.data.available).toBe(false); // Загальна доступність false
        expect(res.body.data.details).toHaveProperty('sizes');
        expect(res.body.data.details.sizes.length).toBe(2);
        expect(res.body.data.details.sizes[0].available).toBe(false);
        expect(res.body.data.details.sizes[1].available).toBe(false);
    });

    it('SYS_CLIENT_PRODUCT_010: (Негативний) Перевірка наявності товару за неіснуючим ID', async () => {
        // FR22, NFR06
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .get(`/api/product/availability/${nonExistentId}`)
            .expect(404); // Контролер повертає 404 у цьому випадку

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Товар не знайдено');
    });

    it('(Негативний) Перевірка наявності товару за невалідним ID', async () => {
        // FR22, NFR06
        const invalidId = 'invalid-id';
        const res = await request(server)
            .get(`/api/product/availability/${invalidId}`)
            .expect(500); // Контролер кидає помилку Mongoose, що призводить до 500

         expect(res.body.success).toBe(false);
         expect(res.body.message).toMatch(/Помилка при перевірці наявності товару/i);
         // Опціонально перевірити помилку, якщо вона повертається
         // expect(res.body.error).toMatch(/Cast to ObjectId failed/i);
    });
});
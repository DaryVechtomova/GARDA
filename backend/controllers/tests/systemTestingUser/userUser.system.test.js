// controllers/tests/systemTestingUser/userUser.system.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'; // Потрібен для хешування у beforeEach логіну
import jwt from 'jsonwebtoken'; // Потрібен для генерації токенів (якщо знадобиться пізніше)
import { app } from '../../../server.js'; // Ваш експортований app (переконайтесь, що export працює)
import userModel from '../../../models/userModel.js'; // Ваша модель користувача

let server; // Змінна для зберігання інстансу сервера
// Визначаємо тестову URI та JWT секрет
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_auth'; // Вкажіть УНІКАЛЬНУ назву для цієї групи тестів
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests'; // Використовуйте секрет, що відповідає вашому .env

// --- Налаштування Тестового Середовища ---

beforeAll(async () => {
    //await mongoose.connection.readyState;
    await mongoose.connect(TEST_MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    // Запускаємо сервер на випадковому порті
    server = app.listen(0);
    // Перевірка секрету JWT
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests') {
        console.warn('Warning: Using fallback JWT secret for tests. Set JWT_SECRET environment variable.');
    }
});

// Глобальний beforeEach для очищення даних перед кожним тестом
beforeEach(async () => {
    // Очищення колекції користувачів
    await userModel.deleteMany({});

});


afterAll(async () => {
    // Закриття з'єднання з БД
    // await mongoose.connection.close();
    // console.log('Test DB connection closed (Users)');
    await server.close();
    await mongoose.connection.close();
});


// --- Тести Реєстрації ---
describe('POST /api/user/register', () => {

    const validUserData = {
        firstName: 'Тест',
        secondName: 'Тестенко',
        middleName: 'Тестович',
        email: 'test.user@example.com',
        phoneNumber: '+380991234567',
        password: 'password123',
    };

    it('SYS_CLIENT_AUTH_001: (Позитивний) Успішна реєстрація нового користувача', async () => {
        // FR27, FR28, NFR01
        const res = await request(server) // Використовуємо інстанс сервера 'server'
            .post('/api/user/register')
            .send(validUserData)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        expect(res.body.role).toBe('користувач');
        expect(res.body.firstName).toBe(validUserData.firstName);

        const userInDb = await userModel.findOne({ email: validUserData.email });
        expect(userInDb).not.toBeNull();
        expect(userInDb.email).toBe(validUserData.email);
        expect(userInDb.password).toBeDefined();
        expect(userInDb.password).not.toBe(validUserData.password); // Перевірка хешування
    });

    it('SYS_CLIENT_AUTH_002: (Негативний) Реєстрація з email, який вже існує', async () => {
        // FR28
         // Спочатку створюємо користувача напряму в БД (не через API)
         // Пароль не важливий для цього тесту
         await userModel.create({ ...validUserData, password: 'hashedPasswordPlaceholder' });

        const res = await request(server)
            .post('/api/user/register')
            .send(validUserData) // Надсилаємо ті ж дані
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Такий користувач вже існує');
    });

    it('SYS_CLIENT_AUTH_003: (Негативний) Реєстрація без поля firstName', async () => {
        // FR28, NFR04
        const { firstName, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть ім'я");
    });

     it('SYS_CLIENT_AUTH_004: (Негативний) Реєстрація без поля secondName', async () => {
        // FR28, NFR04
        const { secondName, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть прізвище");
    });

    it('SYS_CLIENT_AUTH_005: (Негативний) Реєстрація без поля middleName', async () => {
        // FR28, NFR04
        const { middleName, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть по батькові");
    });

     it('SYS_CLIENT_AUTH_006: (Негативний) Реєстрація без поля email', async () => {
        // FR28, NFR04
        const { email, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть електронну пошту");
    });

     it('SYS_CLIENT_AUTH_007: (Негативний) Реєстрація без поля phoneNumber', async () => {
        // FR28, NFR04
        const { phoneNumber, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть номер телефону");
    });

    it('SYS_CLIENT_AUTH_008: (Негативний) Реєстрація без поля password', async () => {
        // FR28, NFR04
        const { password, ...invalidData } = validUserData;
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть пароль");
    });

    it('SYS_CLIENT_AUTH_009: (Негативний) Реєстрація з невалідним форматом email', async () => {
        // FR28
        const invalidData = { ...validUserData, email: 'not-an-email' };
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Будь ласка, введіть коректну адресу/i);
    });

    it('SYS_CLIENT_AUTH_010: (Негативний) Реєстрація з паролем менше 8 символів', async () => {
        // FR28
        const invalidData = { ...validUserData, password: 'short' };
        const res = await request(server)
            .post('/api/user/register')
            .send(invalidData)
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Пароль має містити щонайменше 8 символів');
    });
});

// --- Тести Логіну ---
describe('POST /api/user/login', () => {

    const validUserCredentials = {
        email: 'login.user@example.com',
        password: 'password123', // Пароль у відкритому вигляді для тесту
        // Решта полів потрібна для створення користувача в beforeEach
        firstName: 'Логін',
        secondName: 'Юзер',
        middleName: 'Тест',
        phoneNumber: '+380991112233',
        role: 'користувач' // Явно вказуємо роль
    };

    // Створюємо користувача СПЕЦІАЛЬНО для тестів логіну перед кожним з них
    beforeEach(async () => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(validUserCredentials.password, salt);
        // Створюємо користувача з хешованим паролем
        await userModel.create({ ...validUserCredentials, password: hashedPassword });
         console.log(`Login Test Setup: Created user ${validUserCredentials.email}`);
    });

    it('SYS_CLIENT_AUTH_011: (Позитивний) Успішний логін існуючого користувача', async () => {
        // FR26, NFR02, NFR07, NFR08
        const res = await request(server) // Використовуємо інстанс сервера 'server'
            .post('/api/user/login')
            .send({ email: validUserCredentials.email, password: validUserCredentials.password }) // Надсилаємо пароль у відкритому вигляді
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        expect(res.body.role).toBe('користувач');
        expect(res.body.firstName).toBe(validUserCredentials.firstName);
    });

    it('SYS_CLIENT_AUTH_012: (Негативний) Логін з неправильним паролем', async () => {
        // FR26, NFR06, NFR07, NFR08
        const res = await request(server)
            .post('/api/user/login')
            .send({ email: validUserCredentials.email, password: 'wrongpassword' })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Некоректні дані');
    });

    it('SYS_CLIENT_AUTH_013: (Негативний) Логін з email, якого не існує', async () => {
        // FR26, NFR06, NFR07, NFR08
        const res = await request(server)
            .post('/api/user/login')
            .send({ email: 'nonexistent@example.com', password: 'password123' })
            .expect(200);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Такого користувача не існує');
    });

    it('SYS_CLIENT_AUTH_014: (Негативний) Логін без поля email', async () => {
        // NFR04
        const res = await request(server)
            .post('/api/user/login')
            .send({ password: validUserCredentials.password })
            .expect(200); // Ваш код обробляє це і повертає 200 + помилку

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Такого користувача не існує'); // findOne({ email: undefined }) поверне null
    });

    it('SYS_CLIENT_AUTH_015: (Негативний) Логін без поля password', async () => {
        // NFR04
         const res = await request(server)
            .post('/api/user/login')
            .send({ email: validUserCredentials.email })
            .expect(200); // Ваш код обробляє це і повертає 200 + помилку

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Помилка сервера'); // bcrypt.compare з undefined password дасть false
    });
});
// controllers/tests/systemTestingUser/userProfile.system.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // Import for decoding token payload if needed
import { app } from '../../../server.js'; // Ваш експортований app
import userModel from '../../../models/userModel.js'; // Ваша модель користувача

let server; // Інстанс сервера
let testUser; // Зберігатиме дані тестового користувача
let testUserToken; // Зберігатиме JWT токен тестового користувача

// Визначаємо тестову URI та JWT секрет
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_profile'; // Унікальна БД для тестів профілю
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests';

// Дані для тестового користувача
const baseUserData = {
    firstName: 'Профіль',
    secondName: 'Тестовий',
    middleName: 'Клієнт',
    email: 'profile.tester@example.com',
    phoneNumber: '+380995554433',
    password: 'password123', // Оригінальний пароль
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

// Глобальний beforeEach для очищення колекції
beforeEach(async () => {
    // Очищення колекції користувачів
    await userModel.deleteMany({});


    // Створюємо І отримуємо ТОКЕН для тестового користувача перед КОЖНИМ тестом профілю
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(baseUserData.password, salt);
    testUser = await userModel.create({ ...baseUserData, password: hashedPassword });

    // Логінимося, щоб отримати актуальний токен
    const loginRes = await request(server)
        .post('/api/user/login')
        .send({ email: baseUserData.email, password: baseUserData.password }); // Логін з оригінальним паролем

    expect(loginRes.statusCode).toBe(200); // Перевірка успішного логіну
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body).toHaveProperty('token');
    testUserToken = loginRes.body.token; // Зберігаємо токен
    console.log(`   User Profile Test Setup: Created and obtained token for ${testUser.email}`);
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


// --- II. Тести Профілю Користувача ---

describe('GET /api/user/my-profile', () => {

    it('SYS_CLIENT_PROFILE_001: (Позитивний) Успішне отримання даних свого профілю', async () => {
        // FR29, NFR02, NFR08
        const res = await request(server)
            .get('/api/user/my-profile')
            .set('Authorization', `Bearer ${testUserToken}`) // Додаємо токен
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('userData');
        expect(res.body.userData.email).toBe(baseUserData.email);
        expect(res.body.userData.firstName).toBe(baseUserData.firstName);
        expect(res.body.userData.id).toBe(testUser._id.toString());
        // Перевірити й інші поля, якщо потрібно (region, city тощо - спочатку вони будуть null/undefined)
        expect(res.body.userData).not.toHaveProperty('password'); // Переконуємося, що пароль не передається
    });

    it('SYS_CLIENT_PROFILE_002: (Безпека/Негативний) Спроба доступу без токена', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .get('/api/user/my-profile')
            .expect(401); // Або інший статус, який повертає ваш authMiddleware

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch("Для виконання цієї дії необхідно авторизуватися"); // Або інше повідомлення від authMiddleware
    });

    it('SYS_CLIENT_PROFILE_003: (Безпека/Негативний) Спроба доступу з невалідним токеном', async () => {
        // NFR02, NFR03 (authMiddleware)
        const invalidToken = 'Bearer ' + jwt.sign({ id: testUser._id, role: 'користувач' }, 'wrong-secret', { expiresIn: '1h' });
        const res = await request(server)
            .get('/api/user/my-profile')
            .set('Authorization', invalidToken)
            .expect(401);

         expect(res.body.success).toBe(false);
         // Повідомлення може бути різним, залежно від помилки JWT (invalid signature, expired тощо)
         expect(res.body.message).toMatch("Недійсний токен авторизації.");
    });

     it('SYS_CLIENT_PROFILE_003b: (Безпека/Негативний) Спроба доступу з простроченим токеном', async () => {
        // NFR03 (authMiddleware)
        const expiredToken = 'Bearer ' + jwt.sign({ id: testUser._id, role: 'користувач' }, JWT_SECRET, { expiresIn: '-1s' }); // Прострочений
        const res = await request(server)
            .get('/api/user/my-profile')
            .set('Authorization', expiredToken)
            .expect(401);

         expect(res.body.success).toBe(false);
         expect(res.body.message).toMatch("Термін дії сесії закінчився. Будь ласка, увійдіть знову."); // Часто jwt expired теж дає "Invalid token"
    });
});

describe('PUT /api/user/update-client-profile', () => {

    const profileUpdateData = {
        firstName: 'Оновлене Ім\'я',
        secondName: 'Оновлене Прізвище',
        middleName: 'Оновлене По-батькові',
        phoneNumber: '+380669998877',
        birthDate: '1995-05-15', // YYYY-MM-DD
        region: 'Тестова область',
        city: 'Тестове місто',
        street: 'Тестова вулиця',
        houseNumber: '10А',
        apartmentNumber: '55',
        postalCode: '12345'
    };

    it('SYS_CLIENT_PROFILE_004: (Позитивний) Успішне оновлення всіх полів профілю', async () => {
        // FR30, NFR08
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(profileUpdateData)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Профіль успішно оновлено');
        expect(res.body).toHaveProperty('userData');
        expect(res.body.userData.firstName).toBe(profileUpdateData.firstName);
        expect(res.body.userData.phoneNumber).toBe(profileUpdateData.phoneNumber);
        expect(res.body.userData.city).toBe(profileUpdateData.city);
        expect(new Date(res.body.userData.birthDate).toISOString().split('T')[0]).toBe(profileUpdateData.birthDate);

        // Перевірка в базі даних
        const updatedUserInDb = await userModel.findById(testUser._id);
        expect(updatedUserInDb.firstName).toBe(profileUpdateData.firstName);
        expect(updatedUserInDb.postalCode).toBe(profileUpdateData.postalCode);
    });

    it('SYS_CLIENT_PROFILE_005: (Позитивний) Оновлення лише частини полів (телефон та місто)', async () => {
        // FR30
        const partialUpdate = {
            phoneNumber: '+380112223344',
            city: 'Інше Місто',
        };
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
             // Надсилаємо тільки частину даних, АЛЕ обов'язкові (ПІБ, тел) мають бути!
             .send({
                firstName: baseUserData.firstName, // Залишаємо старе
                secondName: baseUserData.secondName,
                middleName: baseUserData.middleName,
                phoneNumber: partialUpdate.phoneNumber, // Оновлюємо
                city: partialUpdate.city // Оновлюємо
             })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.userData.phoneNumber).toBe(partialUpdate.phoneNumber);
        expect(res.body.userData.city).toBe(partialUpdate.city);
        expect(res.body.userData.firstName).toBe(baseUserData.firstName); // Переконуємося, що інше не змінилося (хоча й було передано)

        const updatedUserInDb = await userModel.findById(testUser._id);
        expect(updatedUserInDb.phoneNumber).toBe(partialUpdate.phoneNumber);
        expect(updatedUserInDb.city).toBe(partialUpdate.city);
        expect(updatedUserInDb.firstName).toBe(baseUserData.firstName);
    });

     it('SYS_CLIENT_PROFILE_006: (Негативний) Оновлення без firstName', async () => {
        // FR30, NFR04
        const { firstName, ...invalidData } = profileUpdateData; // Видаляємо firstName
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(invalidData)
            .expect(400); // Очікуємо Bad Request

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть ім'я");
    });

     it('SYS_CLIENT_PROFILE_007: (Негативний) Оновлення без secondName', async () => {
        // FR30, NFR04
        const { secondName, ...invalidData } = profileUpdateData;
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(invalidData)
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть прізвище");
    });

     it('SYS_CLIENT_PROFILE_008: (Негативний) Оновлення без middleName', async () => {
        // FR30, NFR04
        const { middleName, ...invalidData } = profileUpdateData;
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(invalidData)
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть по батькові");
    });

     it('SYS_CLIENT_PROFILE_009: (Негативний) Оновлення без phoneNumber', async () => {
        // FR30, NFR04
        const { phoneNumber, ...invalidData } = profileUpdateData;
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(invalidData)
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Будь ласка, введіть номер телефону");
    });

     it('SYS_CLIENT_PROFILE_010: (Негативний) Оновлення з невалідним форматом birthDate', async () => {
        // NFR04
         // Зберігаємо обов'язкові поля, але змінюємо birthDate
        const invalidData = {
             ...profileUpdateData, // Всі інші поля валідні
            birthDate: 'invalid-date-format'
         };
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(invalidData)
            // Очікуваний статус може бути 500 або 400 залежно від того,
            // як Mongoose обробляє помилку кастингу дати і як ви її перехоплюєте
            .expect(500); // Припускаємо, що виникає помилка сервера через кастинг

         // Перевіряємо відповідь, якщо це можливо
         if (res.status !== 500) { // Якщо раптом оброблено як 400
             expect(res.body.success).toBe(false);
             // Повідомлення може бути складним через помилку кастингу
             expect(res.body.message).toMatch(/Помилка сервера|ValidationError/i);
         }
    });

     it('SYS_CLIENT_PROFILE_011: (Безпека/Негативний) Спроба оновити профіль без токена', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .put('/api/user/update-client-profile')
            .send(profileUpdateData)
            .expect(401);

         expect(res.body.success).toBe(false);
         expect(res.body.message).toMatch("Для виконання цієї дії необхідно авторизуватися");
    });
});

describe('POST /api/user/change-password', () => {
    const newValidPassword = 'newSecurePassword123';

    it('SYS_CLIENT_PROFILE_012: (Позитивний) Успішна зміна пароля', async () => {
        // FR31, FR32, NFR01
        const res = await request(server)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
                oldPassword: baseUserData.password, // Використовуємо оригінальний пароль
                newPassword: newValidPassword
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Пароль успішно змінено');

        // Перевірка зміни пароля в БД
        const userInDb = await userModel.findById(testUser._id);
        const isMatch = await bcrypt.compare(newValidPassword, userInDb.password);
        const isOldMatch = await bcrypt.compare(baseUserData.password, userInDb.password);
        expect(isMatch).toBe(true); // Новий пароль підходить
        expect(isOldMatch).toBe(false); // Старий пароль більше не підходить
    });

    it('SYS_CLIENT_PROFILE_013: (Негативний) Зміна пароля з неправильним старим паролем', async () => {
        // FR32, NFR06
        const res = await request(server)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
                oldPassword: 'wrongOldPassword',
                newPassword: newValidPassword
            })
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Невірний старий пароль');
    });

    it('SYS_CLIENT_PROFILE_014: (Негативний) Новий пароль коротший за 8 символів', async () => {
        // NFR04 (Validation in controller)
        const res = await request(server)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
                oldPassword: baseUserData.password,
                newPassword: 'short'
            })
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Новий пароль має містити щонайменше 8 символів');
    });

     it('SYS_CLIENT_PROFILE_015a: (Негативний) Зміна пароля без oldPassword', async () => {
        // NFR04 (Validation in controller)
        const res = await request(server)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ newPassword: newValidPassword }) // Немає oldPassword
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Старий та новий паролі обов\'язкові');
    });

     it('SYS_CLIENT_PROFILE_015b: (Негативний) Зміна пароля без newPassword', async () => {
        // NFR04 (Validation in controller)
        const res = await request(server)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ oldPassword: baseUserData.password }) // Немає newPassword
            .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Старий та новий паролі обов\'язкові');
    });

     it('(Безпека/Негативний) Спроба змінити пароль без токена', async () => {
        // NFR02 (authMiddleware)
        const res = await request(server)
            .post('/api/user/change-password')
            .send({
                oldPassword: baseUserData.password,
                newPassword: newValidPassword
            })
            .expect(401);

         expect(res.body.success).toBe(false);
         expect(res.body.message).toMatch("Для виконання цієї дії необхідно авторизуватися");
    });
});
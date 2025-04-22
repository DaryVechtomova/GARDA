const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Переконайтеся, що ваш сервер app експортується
const User = require('../../../models/userModel');

let existingUserToken;
let existingUserId;
const existingUserEmail = 'test.user.exists@example.com';
const existingUserPassword = 'password123';

// Використовуйте ті самі змінні середовища або визначте тестові
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_user_tests';

// Функція для генерації JWT токена (та сама, що й у контролері)
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1d' });
};

// --- Налаштування тестового середовища ---
beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Users)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_user_tests') {
        console.warn('Warning: Using fallback JWT secret for tests (Users).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Users)');
});

// --- Очищення та створення базового користувача перед кожним тестом ---
beforeEach(async () => {
    await User.deleteMany({});

    // Створюємо одного користувача для тестів логіну та дій, що потребують автентифікації
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(existingUserPassword, salt);
    const user = await User.create({
        firstName: 'Тест',
        secondName: 'Юзер',
        middleName: 'Тестович',
        email: existingUserEmail,
        phoneNumber: '1234567890',
        password: hashedPassword,
        role: 'користувач',
        // Можна додати інші поля за замовчуванням, якщо потрібно
        birthDate: new Date('2000-01-01'),
    });
    existingUserId = user._id;
    existingUserToken = generateToken(existingUserId, 'користувач');
});

// --- Тести для POST /api/user/register ---
describe('POST /api/user/register (User Registration)', () => {
    const newUser = {
        firstName: "Новий",
        secondName: "Користувач",
        middleName: "Реєстратович",
        email: "new.user@example.com",
        phoneNumber: "9876543210",
        password: "newSecurePassword",
    };

    it('TCU_REG_01 - має успішно зареєструвати нового користувача (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/register')
            .send(newUser);

        expect(response.statusCode).toBe(200); // Ваш контролер повертає json(), що зазвичай 200 OK
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.role).toBe('користувач');
        expect(response.body.firstName).toBe(newUser.firstName);

        // Перевірка в базі даних
        const dbUser = await User.findOne({ email: newUser.email });
        expect(dbUser).not.toBeNull();
        expect(dbUser.role).toBe('користувач');
        expect(dbUser.email).toBe(newUser.email);
        // Перевірка, що пароль збережено як хеш
        const isPasswordMatch = await bcrypt.compare(newUser.password, dbUser.password);
        expect(isPasswordMatch).toBe(true);
    });

    it('TCU_REG_02 - має повернути помилку, якщо email вже існує (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/user/register')
            .send({ ...newUser, email: existingUserEmail }); // Використовуємо email вже існуючого юзера

        expect(response.statusCode).toBe(200); // Контролер повертає res.json
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Такий користувач вже існує");
    });

    it('TCU_REG_03 - має повернути помилку, якщо відсутнє firstName (200 OK, success: false)', async () => {
        const { firstName, ...incompleteUser } = newUser;
        const response = await request(app)
            .post('/api/user/register')
            .send(incompleteUser);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть ім'я");
    });

     it('TCU_REG_04 - має повернути помилку, якщо відсутній password (200 OK, success: false)', async () => {
        const { password, ...incompleteUser } = newUser;
        const response = await request(app)
            .post('/api/user/register')
            .send(incompleteUser);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть пароль");
    });

     it('TCU_REG_05 - має повернути помилку, якщо пароль закороткий (менше 8 символів) (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/user/register')
            .send({ ...newUser, password: "123" });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Пароль має містити щонайменше 8 символів");
    });

    it('TCU_REG_06 - має повернути помилку, якщо email невалідний (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/user/register')
            .send({ ...newUser, email: "invalid-email" });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть коректну адресу електронної пошти");
    });

});

// --- Тести для POST /api/user/login ---
describe('POST /api/user/login (User Login)', () => {
    it('TCU_LOG_01 - має успішно залогінити існуючого користувача (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: existingUserEmail,
                password: existingUserPassword,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.role).toBe('користувач');
        expect(response.body.firstName).toBe('Тест');
    });

    it('TCU_LOG_02 - має повернути помилку при неправильному паролі (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: existingUserEmail,
                password: 'wrongPassword',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Некоректні дані");
    });

    it('TCU_LOG_03 - має повернути помилку при неіснуючому email (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: 'non.existent@example.com',
                password: existingUserPassword,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Такого користувача не існує");
    });

     it('TCU_LOG_04 - має повернути помилку, якщо email не передано', async () => {
         // Очікувана поведінка може відрізнятися. Тут перевіряємо, чи видасть "користувача не існує"
        const response = await request(app)
            .post('/api/user/login')
            .send({
                // email відсутній
                password: existingUserPassword,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        // Припускаємо, що findOne({email: undefined}) поверне null
        expect(response.body.message).toBe("Такого користувача не існує");
    });

    it('TCU_LOG_05 - має повернути помилку, якщо password не передано', async () => {
        // Очікувана поведінка може відрізнятися. Тут перевіряємо, чи видасть "Некоректні дані"
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: existingUserEmail
                // password відсутній
            });
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
         // bcrypt.compare(undefined, hash) видасть помилку або поверне false -> "Помилка сервера"
        expect(response.body.message).toBe("Помилка сервера");
    });
});

// --- Тести для GET /api/user/my-profile ---
describe('GET /api/user/my-profile (Get Current User Data)', () => {
    it('TCU_PRF_01 - має успішно повернути дані залогіненого користувача (200 OK)', async () => {
        const response = await request(app)
            .get('/api/user/my-profile')
            .set('Authorization', `Bearer ${existingUserToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.userData).toBeDefined();
        expect(response.body.userData.id).toBe(String(existingUserId));
        expect(response.body.userData.email).toBe(existingUserEmail);
        expect(response.body.userData.firstName).toBe('Тест');
        // Перевіряємо, що чутливі дані ВІДСУТНІ
        expect(response.body.userData.password).toBeUndefined();
        expect(response.body.userData.cartData).toBeUndefined();
        expect(response.body.userData.favourites).toBeUndefined();
        expect(response.body.userData.role).toBeUndefined(); // Роль не повертається в getCurrentUser
    });

    it('TCU_PRF_02 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app)
            .get('/api/user/my-profile');

        expect(response.statusCode).toBe(401); // Очікуємо від authMiddleware
    });

    it('TCU_PRF_03 - має повернути 401, якщо токен невалідний', async () => {
        const response = await request(app)
            .get('/api/user/my-profile')
            .set('Authorization', `Bearer invalid.token.here`);

        expect(response.statusCode).toBe(401); // Очікуємо від authMiddleware
    });
});

// --- Тести для PUT /api/user/update-client-profile ---
describe('PUT /api/user/update-client-profile (Update Client Profile)', () => {
    const updateData = {
        firstName: "Оновлене Ім'я",
        secondName: "Оновлене Прізвище",
        middleName: "Оновлене По-Батькові",
        phoneNumber: "0991112233",
        birthDate: "1995-05-15", // Надсилаємо як рядок, контролер має розпарсити
        region: "Тестова область",
        city: "Тестове місто",
        street: "Тестова вулиця",
        houseNumber: "10А",
        apartmentNumber: "5",
        postalCode: "12345",
    };

    it('TCU_UPD_01 - має успішно оновити дані залогіненого користувача (200 OK)', async () => {
        const response = await request(app)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send(updateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Профіль успішно оновлено");
        expect(response.body.userData).toBeDefined();
        expect(response.body.userData.firstName).toBe(updateData.firstName);
        expect(response.body.userData.phoneNumber).toBe(updateData.phoneNumber);
        expect(response.body.userData.region).toBe(updateData.region);
        expect(response.body.userData.postalCode).toBe(updateData.postalCode);
        // Перевірка дати - треба привести до одного формату, бо сервер може повернути об'єкт Date
        expect(new Date(response.body.userData.birthDate).toISOString().split('T')[0])
          .toBe(new Date(updateData.birthDate).toISOString().split('T')[0]);

        // Перевірка в базі даних
        const dbUser = await User.findById(existingUserId);
        expect(dbUser.firstName).toBe(updateData.firstName);
        expect(dbUser.phoneNumber).toBe(updateData.phoneNumber);
        expect(dbUser.region).toBe(updateData.region);
        expect(dbUser.city).toBe(updateData.city);
        expect(dbUser.birthDate.toISOString().split('T')[0]).toBe(new Date(updateData.birthDate).toISOString().split('T')[0]);

    });

    it('TCU_UPD_02 - має повернути 400, якщо відсутнє firstName', async () => {
        const { firstName, ...invalidData } = updateData;
        const response = await request(app)
            .put('/api/user/update-client-profile')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть ім'я");
    });

    it('TCU_UPD_03 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app)
            .put('/api/user/update-client-profile')
            .send(updateData);

        expect(response.statusCode).toBe(401);
    });

});

// --- Тести для POST /api/user/change-password ---
describe('POST /api/user/change-password (Change User Password)', () => {
    const newPassword = 'newPassword123';

    it('TCU_PWD_01 - має успішно змінити пароль користувача (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send({
                oldPassword: existingUserPassword,
                newPassword: newPassword,
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Пароль успішно змінено");

        // Перевірка в базі даних
        const dbUser = await User.findById(existingUserId);
        const isNewPasswordMatch = await bcrypt.compare(newPassword, dbUser.password);
        expect(isNewPasswordMatch).toBe(true);
        const isOldPasswordMatch = await bcrypt.compare(existingUserPassword, dbUser.password);
        expect(isOldPasswordMatch).toBe(false); // Старий пароль більше не дійсний
    });

    it('TCU_PWD_02 - має повернути 400, якщо старий пароль невірний', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send({
                oldPassword: 'wrongOldPassword',
                newPassword: newPassword,
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Невірний старий пароль");
    });

    it('TCU_PWD_03 - має повернути 400, якщо новий пароль закороткий', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send({
                oldPassword: existingUserPassword,
                newPassword: 'short',
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Новий пароль має містити щонайменше 8 символів");
    });

     it('TCU_PWD_04 - має повернути 400, якщо відсутній oldPassword', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${existingUserToken}`)
            .send({
                // oldPassword відсутній
                newPassword: newPassword,
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Старий та новий паролі обов'язкові");
    });

    it('TCU_PWD_05 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .send({
                oldPassword: existingUserPassword,
                newPassword: newPassword,
            });
        expect(response.statusCode).toBe(401);
    });
});

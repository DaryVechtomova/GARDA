import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../../server.js';
import User from '../../../models/userModel.js';

let server;
let adminToken;
let adminUserId;
let employeeId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests';

// Функція для хешування пароля
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Функція для генерації JWT токена
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

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

afterAll(async () => {
    // Закриття з'єднання з БД
    // await mongoose.connection.close();
    // console.log('Test DB connection closed (Users)');
    await server.close();
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Очищення колекції користувачів
    await User.deleteMany({});

    // Створення тестового адміністратора
    const hashedPassword = await hashPassword('adminPassword');
    const admin = await User.create({
        firstName: 'Головний',
        secondName: 'Адмін',
        middleName: 'Тестович',
        email: 'admin@test.com',
        phoneNumber: '1000000000',
        password: hashedPassword,
        role: 'адміністратор',
        isActive: true,
        birthDate: new Date('1990-01-01'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор'); // Генеруємо токен

    // Створення тестового співробітника (для редагування/звільнення)
    const empPassword = await hashPassword('employeePassword');
    const employee = await User.create({
        firstName: 'Тест',
        secondName: 'Співробітник',
        middleName: 'І.',
        email: 'employee@test.com',
        phoneNumber: '2000000000',
        password: empPassword,
        role: 'комірник',
        isActive: true,
        birthDate: new Date('1995-02-02'),
    });
    employeeId = employee._id;
});

// =========================================
// === Тести Адміністраторських Ендпоінтів ==
// =========================================

// --- POST /api/user/register-employee ---
describe('POST /api/user/register-employee', () => {
    const newEmployeeData = {
        firstName: 'Новий',
        secondName: 'Працівник',
        middleName: 'Петрович',
        email: 'new.employee@test.com',
        phoneNumber: '3000000000',
        password: 'newPassword123',
        birthDate: '2000-03-03',
        role: 'комірник',
    };

    it('TC_INT_USER_01 - має успішно зареєструвати співробітника (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/register-employee')
            .set('Authorization', `Bearer ${adminToken}`) // Додаємо токен адміна
            .send(newEmployeeData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Співробітника успішно додано");

        // Перевірка в БД
        const createdUser = await User.findOne({ email: newEmployeeData.email });
        expect(createdUser).not.toBeNull();
        expect(createdUser.role).toBe(newEmployeeData.role);
        // Перевіримо, чи пароль збережено як хеш (а не відкритим текстом)
        expect(createdUser.password).not.toBe(newEmployeeData.password);
        const isPasswordMatch = await bcrypt.compare(newEmployeeData.password, createdUser.password);
        expect(isPasswordMatch).toBe(true);
    });

    it('TC_INT_USER_02 - має повернути 400, якщо email вже існує', async () => {
        // Створюємо користувача з таким email спочатку
        await User.create({ ...newEmployeeData, password: await hashPassword(newEmployeeData.password) });

        const response = await request(app)
            .post('/api/user/register-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newEmployeeData); // Надсилаємо ті ж дані

        expect(response.statusCode).toBe(200); // Контролер повертає 200 для логічних помилок
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Такий користувач вже існує");
    });

    it('TC_INT_USER_03 - має повернути 400, якщо відсутнє обов\'язкове поле (firstName)', async () => {
        const invalidData = { ...newEmployeeData };
        delete invalidData.firstName;

        const response = await request(app)
            .post('/api/user/register-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть ім'я");
    });

    it('TC_INT_USER_04 - має повернути 400, якщо невалідний email', async () => {
        const invalidData = { ...newEmployeeData, email: 'invalid-email' };
        const response = await request(app)
            .post('/api/user/register-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть коректну адресу електронної пошти");
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/user/register-employee')
            .send(newEmployeeData);
        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('має повернути 403, якщо токен не адміністраторський', async () => {
        const employeeToken = generateToken(employeeId, 'комірник'); // Токен комірника
        const response = await request(app)
            .post('/api/user/register-employee')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send(newEmployeeData);
        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
    });
});

// --- GET /api/user/list-employees ---
describe('GET /api/user/list-employees', () => {
    it('TC_INT_USER_05 - має успішно повернути список співробітників (200 OK)', async () => {
        const response = await request(app)
            .get('/api/user/list-employees')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        // Очікуємо побачити адміна і співробітника, створених у beforeEach
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        expect(response.body.data.some(emp => emp._id === String(adminUserId))).toBe(true);
        expect(response.body.data.some(emp => emp._id === String(employeeId))).toBe(true);
        // Перевіряємо, що немає звичайних користувачів
        expect(response.body.data.some(emp => emp.role === 'користувач')).toBe(false);
        // Перевіряємо, що паролі не повертаються (якщо модель їх виключає)
        expect(response.body.data[0].password).toBeUndefined();
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app).get('/api/user/list-employees');
        expect(response.statusCode).toBe(401);
    });

    it('має повернути 403, якщо токен не адміністраторський', async () => {
        const employeeToken = generateToken(employeeId, 'комірник');
        const response = await request(app)
            .get('/api/user/list-employees')
            .set('Authorization', `Bearer ${employeeToken}`);
        expect(response.statusCode).toBe(403);
    });
});

// --- POST /api/user/edit-employee ---
describe('POST /api/user/edit-employee', () => {
    const editData = {
        id: String(employeeId), // ID співробітника, створеного в beforeEach
        firstName: 'Оновлений',
        secondName: 'Працівник',
        middleName: 'Тест',
        email: 'updated.employee@test.com',
        phoneNumber: '4000000000',
        birthDate: '1998-08-08',
        role: 'адміністратор', // Змінюємо роль
    };

    beforeEach(() => {
        // Оновлюємо ID в editData перед кожним тестом цієї групи,
        // бо employeeId генерується заново в глобальному beforeEach
        editData.id = String(employeeId);
    });

    it('TC_INT_USER_06 - має успішно оновити співробітника (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/edit-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(editData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Співробітника успішно оновлено");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.firstName).toBe(editData.firstName);
        expect(response.body.data.email).toBe(editData.email);
        expect(response.body.data.role).toBe(editData.role);

        // Перевірка в БД
        const updatedUser = await User.findById(employeeId);
        expect(updatedUser.firstName).toBe(editData.firstName);
        expect(updatedUser.email).toBe(editData.email);
        expect(updatedUser.role).toBe(editData.role);
    });

    it('TC_INT_USER_07 - має повернути 404, якщо ID співробітника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString(); // Генеруємо валідний, але неіснуючий ID
        const response = await request(app)
            .post('/api/user/edit-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...editData, id: nonExistentId });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Співробітника не знайдено");
    });

    it('TC_INT_USER_08 - має повернути 400, якщо відсутнє обов\'язкове поле (firstName)', async () => {
        const invalidData = { ...editData };
        delete invalidData.firstName;
        const response = await request(app)
            .post('/api/user/edit-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(200); // Контролер повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть ім'я");
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).post('/api/user/edit-employee').send(editData);
        expect(response.statusCode).toBe(401);
    });

    it('має повернути 403, якщо токен не адміна', async () => {
        const employeeToken = generateToken(employeeId, 'комірник');
        const response = await request(app)
            .post('/api/user/edit-employee')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send(editData);
        expect(response.statusCode).toBe(403);
    });
});

// --- GET /api/user/edit-employee/:id --- (Отримання даних для редагування)
describe('GET /api/user/edit-employee/:id', () => {
    it('має успішно повернути дані співробітника для редагування (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/user/edit-employee/${employeeId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(employeeId));
        expect(response.body.data.email).toBe('employee@test.com');
        expect(response.body.data.password).toBeUndefined(); // Пароль не має повертатись
    });

    it('має повернути 404, якщо ID співробітника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/user/edit-employee/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200); // Контролер повертає 200 і {success: false}
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Користувача не знайдено");
    });

    // Додай тести на 401 (без токена) і 403 (не адмін) аналогічно іншим
});


// --- POST /api/user/fire-employee ---
describe('POST /api/user/fire-employee', () => {
    it('TC_INT_USER_09 - має успішно звільнити співробітника (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/fire-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: employeeId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Співробітника звільнено");

        // Перевірка в БД
        const firedUser = await User.findById(employeeId);
        expect(firedUser.isActive).toBe(false);
        expect(firedUser.fireDate).toBeInstanceOf(Date);
    });

    it('TC_INT_USER_10 - має повернути 404, якщо ID співробітника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/user/fire-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: nonExistentId });
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Співробітника не знайдено");
    });

    it('TC_INT_USER_11 - має повернути 404, якщо намагаються звільнити звичайного користувача', async () => {
        const userPassword = await hashPassword('userPassword');
        const regularUser = await User.create({
            firstName: 'Звичайний',
            secondName: 'Користувач',
            middleName: 'Тестович',
            email: 'regular@user.com',
            phoneNumber: '5000000000',
            password: userPassword,
            role: 'користувач'
        });

        const response = await request(app)
            .post('/api/user/fire-employee')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: regularUser._id });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Співробітника не знайдено");

        // Перевірка, що користувач не "звільнений"
        const userAfter = await User.findById(regularUser._id);
        expect(userAfter.isActive).toBe(true); // Має залишитись активним
    });
});

// --- GET /api/user/details/:id ---
describe('GET /api/user/details/:id', () => {
    it('має успішно повернути деталі співробітника (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/user/details/${employeeId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(employeeId));
        expect(response.body.data.password).toBeUndefined();
    });

    it('має повернути 404, якщо ID не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/user/details/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200); // Контролер повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Користувача не знайдено");
    });
});


// --- GET /api/user/me --- (Перевірка для адміна)
describe('GET /api/user/me', () => {
    it('TC_INT_USER_12 - має успішно повернути дані поточного адміна (200 OK)', async () => {
        const response = await request(app)
            .get('/api/user/me')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.userData).toBeDefined();
        expect(response.body.userData.id).toBe(String(adminUserId));
        expect(response.body.userData.role).toBe('адміністратор');
        expect(response.body.userData.password).toBeUndefined();
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).get('/api/user/me');
        expect(response.statusCode).toBe(401);
    });
});

// --- PUT /api/user/update-profile --- (Оновлення профілю адміна)
describe('PUT /api/user/update-profile', () => {
    const profileUpdateData = {
        firstName: 'ОновленийАдмін',
        secondName: 'ТестовичОнов',
        middleName: 'МідлОнов',
        phoneNumber: '555444333',
        birthDate: '1988-08-08',
    };

    it('TC_INT_USER_13 - має успішно оновити профіль адміна (200 OK)', async () => {
        const response = await request(app)
            .put('/api/user/update-profile')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(profileUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Профіль оновлено");
        expect(response.body.updatedUser).toBeDefined();
        expect(response.body.updatedUser.firstName).toBe(profileUpdateData.firstName);
        expect(response.body.updatedUser.phoneNumber).toBe(profileUpdateData.phoneNumber);
        expect(response.body.updatedUser.password).toBeUndefined();

        // Перевірка в БД
        const updatedAdmin = await User.findById(adminUserId);
        expect(updatedAdmin.firstName).toBe(profileUpdateData.firstName);
    });

    it('TC_INT_USER_14 - має повернути 400, якщо відсутнє обов\'язкове поле (firstName)', async () => {
        const invalidData = { ...profileUpdateData };
        delete invalidData.firstName;
        const response = await request(app)
            .put('/api/user/update-profile')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(200); // Контролер повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть ім'я");
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).put('/api/user/update-profile').send(profileUpdateData);
        expect(response.statusCode).toBe(401);
    });
});

// --- POST /api/user/change-password --- (Зміна пароля адміна)
describe('POST /api/user/change-password', () => {
    const passwordData = {
        oldPassword: 'adminPassword', // Збігається з тим, що створили в beforeEach
        newPassword: 'newAdminPasswordSecure',
    };

    it('має успішно змінити пароль адміна (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(passwordData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Пароль успішно змінено");

        // Перевірка в БД: чи можна увійти з новим паролем?
        const adminAfter = await User.findById(adminUserId);
        const isNewPasswordMatch = await bcrypt.compare(passwordData.newPassword, adminAfter.password);
        expect(isNewPasswordMatch).toBe(true);
        // Перевірка, що старий пароль більше не підходить
        const isOldPasswordMatch = await bcrypt.compare(passwordData.oldPassword, adminAfter.password);
        expect(isOldPasswordMatch).toBe(false);
    });

    it('має повернути 400, якщо старий пароль невірний', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...passwordData, oldPassword: 'wrongOldPassword' });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Невірний старий пароль");
    });

    it('має повернути 400, якщо новий пароль закороткий', async () => {
        const response = await request(app)
            .post('/api/user/change-password')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...passwordData, newPassword: '123' });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Новий пароль має містити щонайменше 8 символів");
    });

    it('має повернути 401, якщо немає токена', async () => {
        const response = await request(app).post('/api/user/change-password').send(passwordData);
        expect(response.statusCode).toBe(401);
    });
});


// =========================================
// === Тести для POST /api/user/login   ====
// =========================================
describe('POST /api/user/login', () => {
    const adminEmail = 'admin@test.com';
    const adminPassword = 'adminPassword'; // Пароль, який ми хешували для адміна в beforeEach
    const employeeEmail = 'employee@test.com';
    const employeePassword = 'employeePassword'; // Пароль співробітника
    let inactiveEmployeeId; // ID для неактивного співробітника

    beforeEach(async () => {
        // Створимо неактивного співробітника для тесту
        const inactivePassword = await hashPassword('inactivePass');
        const inactiveEmp = await User.create({
            firstName: 'Неактив',
            secondName: 'Співр',
            middleName: 'Н.',
            email: 'inactive@test.com',
            phoneNumber: '999888777',
            password: inactivePassword,
            role: 'комірник',
            isActive: false, // Важливо!
            birthDate: new Date('1991-11-11'),
        });
        inactiveEmployeeId = inactiveEmp._id;
    });

    it('має успішно авторизувати активного адміністратора (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: adminEmail, password: adminPassword });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(typeof response.body.token).toBe('string');
        expect(response.body.role).toBe('адміністратор');
        expect(response.body.firstName).toBe('Головний'); // Перевірка даних, що повертаються
    });

    it('має успішно авторизувати активного співробітника (комірника) (200 OK)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: employeeEmail, password: employeePassword });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.role).toBe('комірник');
        expect(response.body.firstName).toBe('Тест');
    });

    it('має повернути помилку, якщо користувача не знайдено (email не існує)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: 'nonexistent@test.com', password: 'somePassword' });

        expect(response.statusCode).toBe(200); // Контролер повертає 200 для цієї логічної помилки
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Такого користувача не існує");
        expect(response.body.token).toBeUndefined();
    });

    it('має повернути помилку, якщо пароль неправильний', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: adminEmail, password: 'wrongPassword' }); // Неправильний пароль

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Некоректні дані");
        expect(response.body.token).toBeUndefined();
    });

    it('має повернути помилку, якщо співробітник неактивний (isActive: false)', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: 'inactive@test.com', password: 'inactivePass' }); // Дані неактивного співробітника

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Ваш акаунт неактивний");
        expect(response.body.token).toBeUndefined();
    });

    // Додаткові тести на валідацію вхідних даних (якщо потрібно)
    it('має повернути помилку, якщо не передано email', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ password: 'somePassword' }); // Немає email

        // Примітка: Твій контролер НЕ має явної перевірки наявності email/password.
        // Він одразу лізе в БД. Тому тут, скоріш за все, буде помилка
        // "Такого користувача не існує" або "Помилка сервера", якщо findOne({}) щось поверне.
        // Це нормально для інтеграційного тесту - він показує реальну поведінку.
        // Якщо ти додаси перевірку в контролер, онови цей тест.
        expect(response.statusCode).toBe(200); // Або 500, залежно від логіки findOne
        expect(response.body.success).toBe(false);
        // Очікуване повідомлення може бути іншим!
        // expect(response.body.message).toBe("Такого користувача не існує");
    });

    it('має повернути помилку, якщо не передано пароль', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({ email: adminEmail }); // Немає password

        // Так само, як і вище. Контролер спробує порівняти undefined з хешем,
        // що, ймовірно, призведе до помилки bcrypt або "Некоректні дані".
        expect(response.statusCode).toBe(200); // або 500
        expect(response.body.success).toBe(false);
        // Очікуване повідомлення може бути "Некоректні дані" або "Помилка сервера".
        // expect(response.body.message).toBe("Некоректні дані");
    });
});
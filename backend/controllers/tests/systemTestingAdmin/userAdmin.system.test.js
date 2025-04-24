const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Імпорт Express app
const User = require('../../../models/userModel'); // Реальна модель

// --- Налаштування Тестового Середовища ---
let adminToken;
let adminUserId;
let employeeId;
let inactiveEmployeeId; // Для тестування звільненого
let regularUserId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_users_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_users_sys';

// Функції-хелпери
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Users System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_users_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Users System).');
    }
    // Очищення колекції
    await User.deleteMany({});
});

afterAll(async () => {
    // Очищення колекції
    await User.deleteMany({});
    await mongoose.connection.close();
    console.log('Test DB connection closed (Users System)');
});

beforeEach(async () => {
    // Створення адміна
    const adminPassword = await hashPassword('SysAdminPass');
    const admin = await User.create({
        firstName: 'SysAdmin', secondName: 'Main', middleName: 'S',
        email: 'sysadmin@test.com', phoneNumber: '1010101010',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1985-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення співробітника
    const empPassword = await hashPassword('SysEmpPass');
    const employee = await User.create({
        firstName: 'SysEmployee', secondName: 'Worker', middleName: 'W',
        email: 'sysemp@test.com', phoneNumber: '2020202020',
        password: empPassword, role: 'комірник', isActive: true,
        birthDate: new Date('1995-02-02')
    });
    employeeId = employee._id;

    // Створення неактивного співробітника
    const inactivePassword = await hashPassword('SysInactivePass');
    const inactiveEmployee = await User.create({
        firstName: 'SysInactive', secondName: 'Fired', middleName: 'F',
        email: 'sysinactive@test.com', phoneNumber: '3030303030',
        password: inactivePassword, role: 'комірник', isActive: false, // Неактивний
        birthDate: new Date('1990-03-03'), fireDate: new Date()
    });
    inactiveEmployeeId = inactiveEmployee._id;

    // Створення звичайного користувача
    const userPassword = await hashPassword('SysUserPass');
    const regularUser = await User.create({
        firstName: 'SysUser', secondName: 'Client', middleName: 'C',
        email: 'sysuser@test.com', phoneNumber: '4040404040',
        password: userPassword, role: 'користувач', isActive: true, // Роль користувач
        birthDate: new Date('2000-04-04')
    });
    regularUserId = regularUser._id;
});

// Системні Тести для User Controller (Admin)
describe('Системне тестування: Адміністратор - Управління користувачами', () => {

    // --- Сценарій: Повний цикл життя співробітника (FR02, FR03, FR04, FR05, FR01) ---
    describe('Сценарій: Повний цикл життя співробітника', () => {
        const newEmpData = {
            firstName: 'Цикл', secondName: 'Життя', middleName: 'Співр',
            email: 'lifecycle.emp@test.com', phoneNumber: '4040404040',
            password: 'lifeCyclePass123', birthDate: '1999-09-09', role: 'комірник'
        };
        let createdEmpId;
        const editedEmpData = {
            firstName: 'Цикл Оновлений', secondName: 'Життя', middleName: 'Співр',
            email: 'lifecycle.emp.updated@test.com', phoneNumber: '4040404041',
            birthDate: '1999-09-10', role: 'адміністратор'
        };

        test('Крок 1 (FR02): Створення співробітника', async () => {
            const response = await request(app)
                .post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newEmpData);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);

            // Отримуємо ID з відповіді сервера
            createdEmpId = response.body.data?._id || response.body.data?.id;
            expect(createdEmpId).toBeDefined();
        });

        test('Крок 2 (FR03): Перегляд списку співробітників', async () => {
            // Додаємо невелику затримку для гарантії індексації в БД
            await new Promise(resolve => setTimeout(resolve, 100));

            const response = await request(app)
                .get('/api/user/list-employees')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);

            // Додатковий лог для діагностики
            console.log('All employees:', response.body.data.map(e => ({ email: e.email, id: e._id })));
            console.log('Looking for:', newEmpData.email);

            const found = response.body.data.find(emp =>
                emp.email === newEmpData.email ||
                (createdEmpId && String(emp._id) === String(createdEmpId))
            );

            expect(found).toBeDefined();
            expect(found.email).toBe(newEmpData.email);
        });

        test('Крок 3 (FR04): Редагування співробітника', async () => {
            // Додайте перевірку, що createdEmpId визначений
            if (!createdEmpId) {
                throw new Error('ID співробітника не визначений - можливо, попередній тест не пройшов');
            }

            const response = await request(app)
                .post('/api/user/edit-employee') // або .post, залежно від вашого API
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editedEmpData, id: createdEmpId.toString() }); // Переконайтеся, що ID є рядком

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 4 (FR05): Звільнення співробітника', async () => {
            if (!createdEmpId) {
                throw new Error('ID співробітника не визначений');
            }

            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: createdEmpId.toString() }); // Явно перетворюємо на рядок

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 5 (FR01 - Негативний): Спроба входу звільненого співробітника', async () => {
            const response = await request(app)
                .post('/api/user/login')
                .send({ email: editedEmpData.email, password: newEmpData.password });

            // Очікуємо або 403 (якщо акаунт неактивний), або 200 з success: false
            expect([200, 403]).toContain(response.statusCode);
            expect(response.body.success).toBe(false);
            expect(["Ваш акаунт неактивний", "Такого користувача не існує", "Некоректні дані"]).toContain(response.body.message);
        });

    });

    // --- Сценарій: Невдала реєстрація (FR02, NFR04, NFR02) ---
    describe('Сценарій: Невдала реєстрація співробітника', () => {
        const invalidData = {
            firstName: 'Невдалий', secondName: 'Рег', middleName: 'П',
            email: 'invalid-reg@test.com', phoneNumber: '5050505050',
            password: 'short', birthDate: '2001-01-01', role: 'адміністратор'
        };

        test('Крок 1 (NFR04): Недостатньо символів у паролі', async () => {
            const response = await request(app)
                .post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Пароль має містити щонайменше 8 символів");
        });

        test('Крок 2 (NFR02): Дублювання email', async () => {
            const validPasswordData = { ...invalidData, password: 'validPassword123', email: 'sysemp@test.com' }; // Використовуємо існуючий email
            const response = await request(app)
                .post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(validPasswordData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Такий користувач вже існує");
        });

        test('Крок 3 (NFR04): Відсутнє обов\'язкове поле (email)', async () => {
            const missingFieldData = { ...invalidData, password: 'validPassword123' };
            delete missingFieldData.email;
            const response = await request(app)
                .post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(missingFieldData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть електронну пошту");
        });
    });

    // --- Сценарій: Керування власним профілем адміна (FR06, FR07, FR08, NFR05) ---
    describe('Сценарій: Керування власним профілем адміна', () => {
        const profileUpdate = {
            firstName: 'АдмінОнов', secondName: 'ПрофільОнов', middleName: 'П.О.',
            phoneNumber: '9876543210', birthDate: '1986-02-15'
        };
        const passwordChange = {
            oldPassword: 'SysAdminPass',
            newPassword: 'newSecureAdminPassword'
        };

        test('Крок 1 (FR06): Отримання даних свого профілю', async () => {
            const response = await request(app)
                .get('/api/user/me') // Використовуємо /me для отримання даних поточного юзера
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.userData).toBeDefined();
            expect(response.body.userData.id).toBe(String(adminUserId));
            expect(response.body.userData.email).toBe('sysadmin@test.com');
            expect(response.body.userData.password).toBeUndefined(); // NFR - Пароль не повертається
        });

        test('Крок 2 (FR07): Оновлення свого профілю', async () => {
            const response = await request(app)
                .put('/api/user/update-profile') // Використовуємо PUT
                .set('Authorization', `Bearer ${adminToken}`)
                .send(profileUpdate);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Профіль оновлено");
            expect(response.body.updatedUser.firstName).toBe(profileUpdate.firstName);
            expect(response.body.updatedUser.phoneNumber).toBe(profileUpdate.phoneNumber);

            // Перевірка в БД
            const updatedAdmin = await User.findById(adminUserId);
            expect(updatedAdmin.firstName).toBe(profileUpdate.firstName);
            expect(updatedAdmin.phoneNumber).toBe(profileUpdate.phoneNumber);
        });

        test('Крок 3 (FR08): Зміна свого пароля (успішна)', async () => {
            const response = await request(app)
                .post('/api/user/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(passwordChange);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Пароль успішно змінено");

            // Перевірка в БД (чи хеш змінився)
            const adminAfterPassChange = await User.findById(adminUserId);
            const isNewPasswordMatch = await bcrypt.compare(passwordChange.newPassword, adminAfterPassChange.password);
            expect(isNewPasswordMatch).toBe(true);
            const isOldPasswordMatch = await bcrypt.compare(passwordChange.oldPassword, adminAfterPassChange.password);
            expect(isOldPasswordMatch).toBe(false);
        });

        test('Крок 4 (FR08 - Негативний): Зміна пароля з невірним старим паролем', async () => {
            const response = await request(app)
                .post('/api/user/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...passwordChange, oldPassword: 'wrongOldPassword' });

            expect(response.statusCode).toBe(400); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Невірний старий пароль");
        });
    });

    // --- Сценарій: Перевірка прав доступу (NFR03) ---
    describe('Сценарій: Перевірка прав доступу (NFR03)', () => {
        let employeeToken;
        beforeEach(() => {
            employeeToken = generateToken(employeeId, 'комірник'); // Токен комірника
        });

        test('Крок 1: Комірник НЕ може реєструвати співробітників', async () => {
            const response = await request(app)
                .post('/api/user/register-employee')
                .set('Authorization', `Bearer ${employeeToken}`) // Токен комірника
                .send({ /* ... валідні дані ... */
                    firstName: 'Fail', secondName: 'Reg', middleName: 'C',
                    email: 'fail.reg@test.com', phoneNumber: '1111111111',
                    password: 'password1234', birthDate: '2002-02-02', role: 'комірник'
                });
            expect(response.statusCode).toBe(403); // Forbidden
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });

        test('Крок 2: Комірник НЕ може редагувати співробітників', async () => {
            const response = await request(app)
                .post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ id: String(adminUserId), firstName: 'FailEdit' });
            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });

        test('Крок 3: Комірник НЕ може звільняти співробітників', async () => {
            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ id: String(adminUserId) });
            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });

        test('Крок 4: Комірник МОЖЕ отримувати свій профіль через /me', async () => {
            const response = await request(app)
                .get('/api/user/me')
                .set('Authorization', `Bearer ${employeeToken}`);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.userData.id).toBe(String(employeeId));
        });

        test('Крок 5: Адміністратор МОЖЕ виконувати дії, недоступні комірнику', async () => {
            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`) // Токен Адміна
                .send({ id: String(employeeId) }); // Звільняємо комірника
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
    describe('Сценарій: Невдале редагування співробітника', () => {
        const editDataBase = {
            firstName: 'EditFail', secondName: 'Test', middleName: 'E',
            phoneNumber: '5050505051', birthDate: '1996-06-06', role: 'комірник'
        };

        test('Крок 1 (FR04 - Негативний): Спроба редагувати неіснуючого співробітника', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editDataBase, id: nonExistentId, email: 'nonexist@edit.test' }); // Додаємо email

            expect(response.statusCode).toBe(404); // Очікуємо Not Found
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Співробітника не знайдено");
        });

        test('Крок 2 (NFR02): Спроба встановити email, який вже використовується іншим', async () => {
            const response = await request(app)
                .post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editDataBase, id: String(employeeId), email: 'sysadmin@test.com' }); // Email адміна
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Користувач з такою електронною поштою вже існує");
        });

        test('Крок 3 (NFR04): Спроба оновити без обов\'язкового поля (phoneNumber)', async () => {
            const invalidData = { ...editDataBase, id: String(employeeId), email: 'unique.edit@test.com' };
            delete invalidData.phoneNumber;
            const response = await request(app)
                .post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть номер телефону");
        });
    });

    // --- НОВИЙ Сценарій: Невдале Звільнення Співробітника (FR05) ---
    describe('Сценарій: Невдале звільнення співробітника', () => {
        test('Крок 1 (FR05 - Негативний): Спроба звільнити неіснуючого співробітника', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: nonExistentId });
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Співробітника не знайдено");
        });

        test('Крок 2 (FR05 - Негативний): Спроба звільнити звичайного користувача', async () => {
            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(regularUserId) }); // ID звичайного користувача
            expect(response.statusCode).toBe(404); // Контролер повертає 404 для некоректної ролі
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Співробітника не знайдено");
        });

        test('Крок 3 (FR05 - Негативний): Спроба звільнити вже звільненого', async () => {
            // Спочатку звільняємо
            await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(employeeId) });
            // Потім пробуємо звільнити ще раз
            const response = await request(app)
                .post('/api/user/fire-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(employeeId) });

            // Контролер не перевіряє, чи вже звільнений, тому просто оновить fireDate ще раз
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            // Можна додати перевірку, що fireDate дійсно оновився (або не змінився значно)
        });
    });

    // Невдале Оновлення Профілю Адміна (FR07, NFR04)
    describe('Сценарій: Невдале оновлення профілю адміна', () => {
        test('Крок 1 (NFR04): Спроба оновити без обов\'язкового поля (secondName)', async () => {
            const invalidData = {
                firstName: 'AdminUpdateFail', middleName: 'MF',
                phoneNumber: '1111111119', birthDate: '1987-07-07'
            };
            // secondName відсутнє
            const response = await request(app)
                .put('/api/user/update-profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть прізвище");
        });

        test('Крок 2 (FR07 - Негативний): Спроба оновити профіль без токена', async () => {
            const validData = {
                firstName: 'AdminUpdate', secondName: 'Valid', middleName: 'V',
                phoneNumber: '1111111118', birthDate: '1988-08-08'
            };
            const response = await request(app)
                .put('/api/user/update-profile')
                // .set('Authorization', `Bearer ${adminToken}`) // Без токена
                .send(validData);
            expect(response.statusCode).toBe(401); // Очікуємо Unauthorized
        });
    });

    // Невдала Зміна Паролю (FR08, NFR04)
    describe('Сценарій: Невдала зміна паролю', () => {
        test('Крок 1 (NFR04): Новий пароль закороткий', async () => {
            const response = await request(app)
                .post('/api/user/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ oldPassword: 'SysAdminPass', newPassword: 'short' });
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Новий пароль має містити щонайменше 8 символів");
        });

        test('Крок 2 (NFR04): Відсутній старий пароль', async () => {
            const response = await request(app)
                .post('/api/user/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ newPassword: 'newValidPassword1' }); // Немає oldPassword
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Старий та новий паролі обов'язкові");
        });

        test('Крок 3 (FR08 - Негативний): Спроба змінити пароль без токена', async () => {
            const response = await request(app)
                .post('/api/user/change-password')
                // .set('Authorization', `Bearer ${adminToken}`) // Без токена
                .send({ oldPassword: 'SysAdminPass', newPassword: 'newValidPassword2' });
            expect(response.statusCode).toBe(401);
        });
    });
});
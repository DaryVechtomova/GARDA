// src/controllers/__tests__/userController.test.js
import {
    loginUser,
    listEmployees,
    registerEmployee,
    editEmployee,
    fireEmployee,
    getCurrentEmployee,
    updateAdminProfile
} from '../userController.js'; // Шлях до твого контролера
import userModel from '../../models/userModel.js'; // Шлях до моделі
import bcrypt from 'bcrypt';
import validator from 'validator';
import jwt from 'jsonwebtoken'; // Потрібен для createToken, який може викликатись

// Мокуємо (імітуємо) модулі, щоб ізолювати контролер
jest.mock('../../models/userModel.js'); // Мокуємо модель User
jest.mock('bcrypt'); // Мокуємо bcrypt
jest.mock('validator'); // Мокуємо validator
jest.mock('jsonwebtoken'); // Мокуємо jwt

// Очищаємо всі моки перед кожним тестом
beforeEach(() => {
    jest.clearAllMocks();
});

// ----- Тести для loginUser -----
describe('loginUser', () => {
    let mockReq;
    let mockRes;
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    const mockUserId = 'user123';
    const mockToken = 'mockJwtToken';

    beforeEach(() => {
        // Базовий запит
        mockReq = {
            body: {
                email: testEmail,
                password: testPassword,
            },
        };
        // Базова відповідь
        mockRes = {
            json: jest.fn(),
        };
        // Скидаємо налаштування моків userModel і bcrypt перед кожним тестом loginUser
        userModel.findOne.mockReset();
        bcrypt.compare.mockReset();
        jwt.sign.mockReset(); // Важливо скидати й мок jwt.sign

        // Стандартний успішний мок для jwt.sign, що використовується в createToken
        jwt.sign.mockReturnValue(mockToken);
    });

    it('має успішно авторизувати активного адміністратора', async () => {
        // Arrange: Готуємо дані знайденого адміна
        const mockAdmin = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'адміністратор',
            isActive: true, // Адмін активний
            firstName: 'Адмін',
            secondName: 'Адміненко',
            middleName: 'Адмінович',
        };
        userModel.findOne.mockResolvedValue(mockAdmin); // Модель знаходить адміна
        bcrypt.compare.mockResolvedValue(true); // Пароль співпадає

        // Act: Викликаємо функцію
        await loginUser(mockReq, mockRes);

        // Assert: Перевіряємо результат
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockAdmin.password);
        expect(jwt.sign).toHaveBeenCalledWith( // Перевіряємо виклик jwt.sign з правильними даними
            { id: mockUserId, role: 'адміністратор' },
            process.env.JWT_SECRET, // Переконайся, що JWT_SECRET доступний у тестовому середовищі або мокни process.env
            { expiresIn: '1d' }
        );
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            token: mockToken,
            role: 'адміністратор',
            firstName: mockAdmin.firstName,
            secondName: mockAdmin.secondName,
            middleName: mockAdmin.middleName,
        });
    });

    it('має успішно авторизувати активного комірника', async () => {
        const mockEmployee = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'комірник',
            isActive: true,
            firstName: 'Комірник',
            secondName: 'Комірненко',
            middleName: 'Комірнович',
        };
        userModel.findOne.mockResolvedValue(mockEmployee);
        bcrypt.compare.mockResolvedValue(true);

        await loginUser(mockReq, mockRes);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockEmployee.password);
        expect(jwt.sign).toHaveBeenCalledWith(
            { id: mockUserId, role: 'комірник' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            token: mockToken,
            role: 'комірник',
            firstName: mockEmployee.firstName,
            secondName: mockEmployee.secondName,
            middleName: mockEmployee.middleName,
        });
    });

    it('має повернути помилку, якщо користувача не знайдено', async () => {
        // Arrange: Модель не знаходить користувача
        userModel.findOne.mockResolvedValue(null);

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).not.toHaveBeenCalled(); // Порівняння пароля не має викликатись
        expect(jwt.sign).not.toHaveBeenCalled(); // Токен не має створюватись
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Такого користувача не існує" });
    });

    it('має повернути помилку, якщо пароль неправильний', async () => {
        // Arrange: Користувач знайдений, але пароль не співпадає
        const mockUser = { _id: mockUserId, email: testEmail, password: 'hashedPassword', role: 'користувач' };
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false); // Пароль не співпадає

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockUser.password);
        expect(jwt.sign).not.toHaveBeenCalled(); // Токен не має створюватись
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Некоректні дані" });
    });

    it('має заборонити вхід звільненому адміністратору (isActive: false)', async () => {
        // Arrange: Звільнений адмін
        const mockAdmin = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'адміністратор',
            isActive: false, // Адмін НЕ активний
        };
        userModel.findOne.mockResolvedValue(mockAdmin);
        bcrypt.compare.mockResolvedValue(true); // Пароль правильний, але акаунт неактивний

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockAdmin.password);
        expect(jwt.sign).not.toHaveBeenCalled(); // Токен не має створюватись
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Ваш акаунт неактивний" });
    });

    it('має заборонити вхід звільненому комірнику (isActive: false)', async () => {
        // Arrange: Звільнений комірник
        const mockEmployee = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'комірник',
            isActive: false, // НЕ активний
        };
        userModel.findOne.mockResolvedValue(mockEmployee);
        bcrypt.compare.mockResolvedValue(true);

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockEmployee.password);
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Ваш акаунт неактивний" });
    });

    it('має повернути помилку сервера, якщо userModel.findOne кидає помилку', async () => {
        // Arrange: Помилка при пошуку
        const dbError = new Error('Database find error');
        userModel.findOne.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError); // Перевіряємо логування помилки
        consoleSpy.mockRestore();
    });

    it('має повернути помилку сервера, якщо bcrypt.compare кидає помилку', async () => {
        // Arrange: Помилка при порівнянні пароля
        const mockUser = { _id: mockUserId, email: testEmail, password: 'hashedPassword', role: 'користувач' };
        const bcryptError = new Error('Bcrypt compare error');
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockRejectedValue(bcryptError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockUser.password);
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith(bcryptError);
        consoleSpy.mockRestore();
    });

    // Опціональний тест: помилка при генерації токену (менш ймовірний сценарій)
    it('має повернути помилку сервера, якщо jwt.sign кидає помилку', async () => {
        // Arrange
        const mockUser = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'користувач',
            isActive: true,
            firstName: 'User', secondName: 'Test', middleName: 'M'
        };
        const jwtError = new Error('JWT sign error');
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockImplementation(() => { // Імітуємо помилку при виклику jwt.sign
            throw jwtError;
        });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockUser.password);
        expect(jwt.sign).toHaveBeenCalled(); // Перевіряємо, що спроба створити токен була
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith(jwtError);
        consoleSpy.mockRestore();
    });
});

// ----- Тести для listEmployees -----
describe('listEmployees', () => {
    it('має повернути список співробітників (адміністраторів та комірників)', async () => {
        // 1. Підготовка (Arrange)
        const mockEmployees = [
            { _id: '1', role: 'адміністратор', firstName: 'Іван' },
            { _id: '2', role: 'комірник', firstName: 'Петро' },
        ];
        // Імітуємо успішну відповідь від userModel.find
        userModel.find.mockResolvedValue(mockEmployees);

        const mockReq = {}; // listEmployees не використовує req
        const mockRes = {
            json: jest.fn(), // Імітуємо метод res.json
        };

        // 2. Дія (Act)
        await listEmployees(mockReq, mockRes);

        // 3. Перевірка (Assert)
        expect(userModel.find).toHaveBeenCalledTimes(1);
        // Перевіряємо, що find викликався з правильним фільтром
        expect(userModel.find).toHaveBeenCalledWith({ role: { $in: ["адміністратор", "комірник"] } });
        // Перевіряємо, що res.json викликався з успішним результатом та даними
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockEmployees });
    });

    it('має повернути помилку сервера, якщо виникла проблема з базою даних', async () => {
        // 1. Підготовка
        const errorMessage = 'DB Error';
        // Імітуємо помилку від userModel.find
        userModel.find.mockRejectedValue(new Error(errorMessage));

        const mockReq = {};
        const mockRes = {
            json: jest.fn(),
        };
        // Також імітуємо console.log, щоб перевірити, чи логується помилка
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // 2. Дія
        await listEmployees(mockReq, mockRes);

        // 3. Перевірка
        expect(userModel.find).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled(); // Перевіряємо, чи була залогована помилка

        consoleSpy.mockRestore(); // Відновлюємо console.log
    });
});

// ----- Тести для registerEmployee -----
describe('registerEmployee', () => {
    let mockReq;
    let mockRes;

    // Готуємо базові mockReq та mockRes для кожного тесту в цій групі
    beforeEach(() => {
        mockReq = {
            body: {
                firstName: 'Тест',
                secondName: 'Тестенко',
                middleName: 'Тестович',
                email: 'test.employee@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                birthDate: '2000-01-01',
                role: 'комірник',
            },
        };
        mockRes = {
            json: jest.fn(),
        };
        // Стандартні успішні моки для залежностей
        validator.isEmail.mockReturnValue(true); // Імейл валідний
        userModel.findOne.mockResolvedValue(null); // Користувач не існує
        bcrypt.genSalt.mockResolvedValue('someSalt'); // Сіль згенерована
        bcrypt.hash.mockResolvedValue('hashedPassword123'); // Пароль захешовано
        // Імітуємо метод save на екземплярі моделі
        const saveMock = jest.fn().mockResolvedValue({ _id: 'newUserId', ...mockReq.body });
        userModel.mockImplementation(() => ({ save: saveMock }));
    });

    it('має успішно зареєструвати співробітника з валідними даними', async () => {
        await registerEmployee(mockReq, mockRes);

        expect(validator.isEmail).toHaveBeenCalledWith(mockReq.body.email);
        expect(userModel.findOne).toHaveBeenCalledWith({ email: mockReq.body.email });
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(mockReq.body.password, 'someSalt');
        expect(userModel).toHaveBeenCalledWith(expect.objectContaining({
            firstName: mockReq.body.firstName,
            email: mockReq.body.email,
            password: 'hashedPassword123', // Перевіряємо, що збережено хешований пароль
            role: mockReq.body.role,
        }));
        // Перевіряємо, що викликався save
        expect(userModel.mock.results[0].value.save).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Співробітника успішно додано" });
    });

    it('має повернути помилку, якщо email вже існує', async () => {
        userModel.findOne.mockResolvedValue({ email: mockReq.body.email }); // Імітуємо існуючого користувача

        await registerEmployee(mockReq, mockRes);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: mockReq.body.email });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Такий користувач вже існує" });
        expect(bcrypt.hash).not.toHaveBeenCalled(); // Не має хешувати пароль, якщо користувач існує
        expect(userModel).not.toHaveBeenCalled(); // Не має створювати новий екземпляр
    });

    it('має повернути помилку, якщо email невалідний', async () => {
        validator.isEmail.mockReturnValue(false); // Імітуємо невалідний email

        await registerEmployee(mockReq, mockRes);

        expect(validator.isEmail).toHaveBeenCalledWith(mockReq.body.email);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, введіть коректну адресу електронної пошти" });
        expect(userModel.findOne).not.toHaveBeenCalled(); // Перевірка зупинилась раніше
    });

    it('має повернути помилку, якщо пароль закороткий', async () => {
        mockReq.body.password = '123'; // Короткий пароль

        await registerEmployee(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Пароль має містити щонайменше 8 символів" });
        expect(userModel.findOne).not.toHaveBeenCalled(); // Перевірка зупинилась раніше
    });

    // Додай аналогічні тести для всіх обов'язкових полів (firstName, lastName і т.д.)
    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['email', "Будь ласка, введіть електронну пошту"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['password', "Будь ласка, введіть пароль"],
        ['birthDate', "Будь ласка, введіть дату народження"],
        ['role', "Будь ласка, оберіть роль"],
    ])('має повернути помилку, якщо %s відсутнє', async (field, expectedMessage) => {
        delete mockReq.body[field]; // Видаляємо поле

        await registerEmployee(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(validator.isEmail).not.toHaveBeenCalled(); // Або викликалось, якщо поле не email/password
    });


    it('має повернути помилку сервера, якщо виникла помилка при збереженні', async () => {
        const saveMock = jest.fn().mockRejectedValue(new Error('DB save error'));
        userModel.mockImplementation(() => ({ save: saveMock }));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await registerEmployee(mockReq, mockRes);

        expect(userModel.mock.results[0].value.save).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

// ----- Тести для editEmployee -----
describe('editEmployee', () => {
    let mockReq;
    let mockRes;
    const employeeId = 'employee123';

    beforeEach(() => {
        mockReq = {
            body: {
                id: employeeId,
                firstName: 'ОновленеІм\'я',
                secondName: 'ОновленеПрізвище',
                middleName: 'ОновленеПоБатькові',
                email: 'updated.employee@example.com',
                phoneNumber: '0987654321',
                birthDate: '1999-12-12',
                role: 'адміністратор',
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes), // Для можливості .status(404).json(...)
        };
        // Стандартний успішний мок
        userModel.findByIdAndUpdate.mockResolvedValue({ _id: employeeId, ...mockReq.body });
    });

    it('має успішно оновити співробітника з валідними даними', async () => {
        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            employeeId,
            { // Очікуємо дані для оновлення (без id)
                firstName: mockReq.body.firstName,
                secondName: mockReq.body.secondName,
                middleName: mockReq.body.middleName,
                email: mockReq.body.email,
                phoneNumber: mockReq.body.phoneNumber,
                birthDate: mockReq.body.birthDate,
                role: mockReq.body.role,
            },
            { new: true } // Опція для повернення оновленого документу
        );
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Співробітника успішно додано", // Зверни увагу, повідомлення тут "додано", можливо варто змінити?
            data: expect.objectContaining({ _id: employeeId, firstName: mockReq.body.firstName }),
        });
    });

    it('має повернути помилку 404, якщо співробітника не знайдено', async () => {
        userModel.findByIdAndUpdate.mockResolvedValue(null); // Імітуємо, що співробітника не знайдено

        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
    });

    // Додай тести на відсутність обов'язкових полів, аналогічно до registerEmployee
    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['email', "Будь ласка, введіть електронну пошту"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['birthDate', "Будь ласка, введіть дату народження"],
    ])('має повернути помилку, якщо %s відсутнє при редагуванні', async (field, expectedMessage) => {
        delete mockReq.body[field];
        await editEmployee(mockReq, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('має повернути помилку сервера при помилці бази даних', async () => {
        userModel.findByIdAndUpdate.mockRejectedValue(new Error('DB update error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

// ----- Тести для fireEmployee -----
describe('fireEmployee', () => {
    let mockReq;
    let mockRes;
    const employeeId = 'employeeToFire';

    beforeEach(() => {
        mockReq = {
            body: {
                id: employeeId,
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
        // Імітуємо метод save на знайденому користувачі
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockEmployee = {
            _id: employeeId,
            role: 'комірник', // Важливо, щоб не був 'користувач'
            isActive: true,
            fireDate: null,
            save: saveMock,
        };
        userModel.findById.mockResolvedValue(mockEmployee);
    });

    it('має успішно звільнити співробітника', async () => {
        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        // Перевіряємо, що властивості було змінено *перед* викликом save
        const foundEmployee = await userModel.findById.mock.results[0].value;
        expect(foundEmployee.isActive).toBe(false);
        expect(foundEmployee.fireDate).toBeInstanceOf(Date); // Перевіряємо, що дата встановлена
        // Перевіряємо, що save було викликано на цьому об'єкті
        expect(foundEmployee.save).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Співробітника звільнено" });
    });

    it('має повернути 404, якщо співробітника не знайдено', async () => {
        userModel.findById.mockResolvedValue(null);

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
        // Переконуємось, що save не викликався
        const findResult = await userModel.findById.mock.results[0].value;
        expect(findResult).toBeNull(); // Немає об'єкта, щоб викликати save
    });

    it('має повернути 404, якщо намагаються звільнити звичайного користувача', async () => {
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockUser = {
            _id: employeeId,
            role: 'користувач', // Змінюємо роль на користувача
            isActive: true,
            save: saveMock,
        };
        userModel.findById.mockResolvedValue(mockUser);

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
        expect(saveMock).not.toHaveBeenCalled(); // Не має викликатись save
    });

    it('має повернути 500 при помилці пошуку в базі даних', async () => {
        userModel.findById.mockRejectedValue(new Error('DB find error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('має повернути 500 при помилці збереження в базі даних', async () => {
        const saveMock = jest.fn().mockRejectedValue(new Error('DB save error'));
        const mockEmployee = {
            _id: employeeId,
            role: 'адміністратор',
            isActive: true,
            save: saveMock // Мок save, який поверне помилку
        };
        userModel.findById.mockResolvedValue(mockEmployee);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(saveMock).toHaveBeenCalledTimes(1); // Перевіряємо, що save викликався
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});


// ----- Тести для getCurrentEmployee -----
describe('getCurrentEmployee', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Цей метод очікує, що дані користувача вже є в req.user (додані мідлварою)
        mockReq = {
            user: {
                _id: 'adminUserId',
                firstName: 'Адмін',
                secondName: 'Адміненко',
                middleName: 'Адмінович',
                email: 'admin@example.com',
                phoneNumber: '111222333',
                birthDate: new Date('1990-05-15'),
                role: 'адміністратор',
                hireDate: new Date('2023-01-10'),
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
    });

    it('має повернути дані поточного співробітника з req.user', async () => {
        await getCurrentEmployee(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            userData: {
                id: mockReq.user._id,
                firstName: mockReq.user.firstName,
                secondName: mockReq.user.secondName,
                middleName: mockReq.user.middleName,
                email: mockReq.user.email,
                phoneNumber: mockReq.user.phoneNumber,
                birthDate: mockReq.user.birthDate,
                role: mockReq.user.role,
                hireDate: mockReq.user.hireDate,
            },
        });
    });

    it('має повернути помилку 404, якщо req.user відсутній', async () => {
        mockReq.user = null; // Імітуємо відсутність користувача в запиті

        await getCurrentEmployee(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Користувача не знайдено (внутрішня помилка)" });
    });

    // Сценарій помилки сервера тут менш ймовірний, бо немає прямої роботи з БД,
    // але можна додати тест на випадок непередбаченої помилки
    it('має повернути 500, якщо сталася неочікувана помилка', async () => {
        // Імітуємо помилку при доступі до властивості req.user (гіпотетично)
        Object.defineProperty(mockReq, 'user', {
            get: () => { throw new Error('Unexpected access error'); }
        });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });


        await getCurrentEmployee(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера при отриманні даних користувача" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

// ----- Тести для updateAdminProfile -----
describe('updateAdminProfile', () => {
    let mockReq;
    let mockRes;
    let mockSelect;
    const adminUserId = 'currentAdminId';

    beforeEach(() => {
        mockReq = {
            user: {
                _id: adminUserId,
            },
            body: {
                firstName: 'НовеІм\'яАдміна',
                secondName: 'НовеПрізвищеАдміна',
                middleName: 'НовеПоБатьковіАдміна',
                phoneNumber: '333444555',
                birthDate: '1985-11-20',
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };

        // Створюємо мок для select
        mockSelect = jest.fn().mockResolvedValue({
            _id: adminUserId,
            email: 'admin@example.com',
            role: 'адміністратор',
            firstName: 'НовеІм\'яАдміна',
            secondName: 'НовеПрізвищеАдміна',
            middleName: 'НовеПоБатьковіАдміна',
            phoneNumber: '333444555',
            birthDate: '1985-11-20'
        });

        // Мокуємо findByIdAndUpdate для повернення об'єкта з методом select
        userModel.findByIdAndUpdate.mockImplementation(() => ({
            select: mockSelect
        }));
    });

    it('має успішно оновити профіль адміністратора', async () => {
        await updateAdminProfile(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            adminUserId,
            {
                firstName: mockReq.body.firstName,
                secondName: mockReq.body.secondName,
                middleName: mockReq.body.middleName,
                phoneNumber: mockReq.body.phoneNumber,
                birthDate: mockReq.body.birthDate,
            },
            { new: true }
        );

        expect(mockSelect).toHaveBeenCalledTimes(1);
        expect(mockSelect).toHaveBeenCalledWith('-password');

        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Профіль оновлено",
            updatedUser: {
                _id: adminUserId,
                email: 'admin@example.com',
                role: 'адміністратор',
                firstName: 'НовеІм\'яАдміна',
                secondName: 'НовеПрізвищеАдміна',
                middleName: 'НовеПоБатьковіАдміна',
                phoneNumber: '333444555',
                birthDate: '1985-11-20'
            }
        });
    });

    // Тести на відсутність обов'язкових полів
    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['birthDate', "Будь ласка, введіть дату народження"],
    ])('має повернути помилку, якщо %s відсутнє', async (field, expectedMessage) => {
        delete mockReq.body[field];
        await updateAdminProfile(mockReq, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('має повернути 404, якщо користувача (адміна) не знайдено для оновлення', async () => {
        mockSelect.mockResolvedValue(null);

        await updateAdminProfile(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockSelect).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Користувача не знайдено"
        });
    });

    it('має повернути 500 при помилці бази даних', async () => {
        userModel.findByIdAndUpdate.mockImplementation(() => {
            return {
                select: jest.fn().mockRejectedValue(new Error('DB update error'))
            };
        });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await updateAdminProfile(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

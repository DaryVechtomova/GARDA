import {
    loginUser,
    listEmployees,
    registerEmployee,
    editEmployee,
    fireEmployee,
    getCurrentEmployee,
    updateAdminProfile,
    changePassword
} from '../../userController.js';
import userModel from '../../../models/userModel.js';
import bcrypt from 'bcrypt';
import validator from 'validator';
import jwt from 'jsonwebtoken';

// Мокуємо (імітуємо) модулі, щоб ізолювати контролер
jest.mock('../../../models/userModel.js'); // Мокуємо модель User
jest.mock('bcrypt'); // Мокуємо bcrypt
jest.mock('validator'); // Мокуємо validator
jest.mock('jsonwebtoken'); // Мокуємо jwt

// Очищаємо всі моки перед кожним тестом
beforeEach(() => {
    jest.clearAllMocks();
});

// Тести для loginUser
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
        jwt.sign.mockReset();

        // Стандартний успішний мок для jwt.sign, що використовується в createToken
        jwt.sign.mockReturnValue(mockToken);
    });

    it('TCUW01 - має успішно авторизувати активного адміністратора', async () => {
        const mockAdmin = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'адміністратор',
            isActive: true,
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
            process.env.JWT_SECRET,
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

    it('TCUW02 - має успішно авторизувати активного комірника', async () => {
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

    it('TCUW03 - має повернути помилку, якщо користувача не знайдено', async () => {
        // Arrange: Модель не знаходить користувача
        userModel.findOne.mockResolvedValue(null);

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Такого користувача не існує" });
    });

    it('TCUW04 - має повернути помилку, якщо пароль неправильний', async () => {
        // Arrange: Користувач знайдений, але пароль не співпадає
        const mockUser = { _id: mockUserId, email: testEmail, password: 'hashedPassword', role: 'користувач' };
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false); // Пароль не співпадає

        // Act
        await loginUser(mockReq, mockRes);

        // Assert
        expect(userModel.findOne).toHaveBeenCalledWith({ email: testEmail });
        expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, mockUser.password);
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Некоректні дані" });
    });

    it('TCUW05 - має заборонити вхід звільненому адміністратору (isActive: false)', async () => {
        // Arrange: Звільнений адмін
        const mockAdmin = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'адміністратор',
            isActive: false,
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

    it('TCUW05 - має заборонити вхід звільненому комірнику (isActive: false)', async () => {
        // Arrange: Звільнений комірник
        const mockEmployee = {
            _id: mockUserId,
            email: testEmail,
            password: 'hashedPassword',
            role: 'комірник',
            isActive: false,
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

    it('TCUE01 - має повернути помилку сервера, якщо userModel.findOne кидає помилку', async () => {
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
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });

    it('TCUE02 - має повернути помилку сервера, якщо bcrypt.compare кидає помилку', async () => {
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
});

// Тести для listEmployees
describe('listEmployees', () => {
    it('TCUR01 - має повернути список співробітників (адміністраторів та комірників)', async () => {
        // Підготовка (Arrange)
        const mockEmployees = [
            { _id: '1', role: 'адміністратор', firstName: 'Іван' },
            { _id: '2', role: 'комірник', firstName: 'Петро' },
        ];
        userModel.find.mockResolvedValue(mockEmployees);

        const mockReq = {};
        const mockRes = {
            json: jest.fn(),
        };

        //Дія (Act)
        await listEmployees(mockReq, mockRes);

        //Перевірка (Assert)
        expect(userModel.find).toHaveBeenCalledTimes(1);
        expect(userModel.find).toHaveBeenCalledWith({ role: { $in: ["адміністратор", "комірник"] } });
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockEmployees });
    });

    it('TCUE03 - має повернути помилку сервера, якщо виникла проблема з базою даних', async () => {
        // Підготовка
        const errorMessage = 'DB Error';
        userModel.find.mockRejectedValue(new Error(errorMessage));

        const mockReq = {};
        const mockRes = {
            json: jest.fn(),
        };
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        //Дія
        await listEmployees(mockReq, mockRes);

        // Перевірка
        expect(userModel.find).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

// Тести для registerEmployee
describe('registerEmployee', () => {
    let mockReq;
    let mockRes;

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
        validator.isEmail.mockReturnValue(true);
        userModel.findOne.mockResolvedValue(null);
        bcrypt.genSalt.mockResolvedValue('someSalt');
        bcrypt.hash.mockResolvedValue('hashedPassword123');
        const saveMock = jest.fn().mockResolvedValue({ _id: 'newUserId', ...mockReq.body });
        userModel.mockImplementation(() => ({ save: saveMock }));
    });

    it('TCUW06 - має успішно зареєструвати співробітника з валідними даними', async () => {
        await registerEmployee(mockReq, mockRes);

        expect(validator.isEmail).toHaveBeenCalledWith(mockReq.body.email);
        expect(userModel.findOne).toHaveBeenCalledWith({ email: mockReq.body.email });
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(mockReq.body.password, 'someSalt');
        expect(userModel).toHaveBeenCalledWith(expect.objectContaining({
            firstName: mockReq.body.firstName,
            email: mockReq.body.email,
            password: 'hashedPassword123',
            role: mockReq.body.role,
        }));
        expect(userModel.mock.results[0].value.save).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Співробітника успішно додано" });
    });

    it('TCUW07 - має повернути помилку, якщо email вже існує', async () => {
        userModel.findOne.mockResolvedValue({ email: mockReq.body.email });

        await registerEmployee(mockReq, mockRes);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: mockReq.body.email });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Такий користувач вже існує" });
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(userModel).not.toHaveBeenCalled();
    });

    it('TCUW09 - має повернути помилку, якщо email невалідний', async () => {
        validator.isEmail.mockReturnValue(false);

        await registerEmployee(mockReq, mockRes);

        expect(validator.isEmail).toHaveBeenCalledWith(mockReq.body.email);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, введіть коректну адресу електронної пошти" });
        expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it('TCUW10 - має повернути помилку, якщо пароль закороткий', async () => {
        mockReq.body.password = '123';

        await registerEmployee(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Пароль має містити щонайменше 8 символів" });
        expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['email', "Будь ласка, введіть електронну пошту"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['password', "Будь ласка, введіть пароль"],
        ['birthDate', "Будь ласка, введіть дату народження"],
        ['role', "Будь ласка, оберіть роль"],
    ])('TCUW08 - має повернути помилку, якщо %s відсутнє', async (field, expectedMessage) => {
        delete mockReq.body[field];

        await registerEmployee(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(validator.isEmail).not.toHaveBeenCalled();
    });


    it('TCUE03 - має повернути помилку сервера, якщо виникла помилка при збереженні', async () => {
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

// Тести для editEmployee
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
            status: jest.fn(() => mockRes),
        };
        userModel.findByIdAndUpdate.mockResolvedValue({ _id: employeeId, ...mockReq.body });
    });

    it('TCUW11 - має успішно оновити співробітника з валідними даними', async () => {
        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            employeeId,
            {
                firstName: mockReq.body.firstName,
                secondName: mockReq.body.secondName,
                middleName: mockReq.body.middleName,
                email: mockReq.body.email,
                phoneNumber: mockReq.body.phoneNumber,
                birthDate: mockReq.body.birthDate,
                role: mockReq.body.role,
            },
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Співробітника успішно оновлено",
            data: expect.objectContaining({ _id: employeeId, firstName: mockReq.body.firstName }),
        });
    });

    it('TCUW13 - має повернути помилку 404, якщо співробітника не знайдено', async () => {
        userModel.findByIdAndUpdate.mockResolvedValue(null);

        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
    });

    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['email', "Будь ласка, введіть електронну пошту"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['birthDate', "Будь ласка, введіть дату народження"],
    ])('TCUW12 - має повернути помилку, якщо %s відсутнє при редагуванні', async (field, expectedMessage) => {
        delete mockReq.body[field];
        await editEmployee(mockReq, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCUE03 - має повернути помилку сервера при помилці бази даних', async () => {
        userModel.findByIdAndUpdate.mockRejectedValue(new Error('DB update error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await editEmployee(mockReq, mockRes);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

// Тести для fireEmployee
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
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockEmployee = {
            _id: employeeId,
            role: 'комірник',
            isActive: true,
            fireDate: null,
            save: saveMock,
        };
        userModel.findById.mockResolvedValue(mockEmployee);
    });

    it('TCUW14 - має успішно звільнити співробітника', async () => {
        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        const foundEmployee = await userModel.findById.mock.results[0].value;
        expect(foundEmployee.isActive).toBe(false);
        expect(foundEmployee.fireDate).toBeInstanceOf(Date);
        expect(foundEmployee.save).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Співробітника звільнено" });
    });

    it('TCUW13 - має повернути 404, якщо співробітника не знайдено', async () => {
        userModel.findById.mockResolvedValue(null);

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
        const findResult = await userModel.findById.mock.results[0].value;
        expect(findResult).toBeNull();
    });

    it('TCUW13 - має повернути 404, якщо намагаються звільнити звичайного користувача', async () => {
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockUser = {
            _id: employeeId,
            role: 'користувач',
            isActive: true,
            save: saveMock,
        };
        userModel.findById.mockResolvedValue(mockUser);

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Співробітника не знайдено" });
        expect(saveMock).not.toHaveBeenCalled();
    });

    it('TCUE03 - має повернути 500 при помилці пошуку в базі даних', async () => {
        userModel.findById.mockRejectedValue(new Error('DB find error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('TCUE03 - має повернути 500 при помилці збереження в базі даних', async () => {
        const saveMock = jest.fn().mockRejectedValue(new Error('DB save error'));
        const mockEmployee = {
            _id: employeeId,
            role: 'адміністратор',
            isActive: true,
            save: saveMock
        };
        userModel.findById.mockResolvedValue(mockEmployee);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await fireEmployee(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(employeeId);
        expect(saveMock).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});


// Тести для getCurrentEmployee
describe('getCurrentEmployee', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
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

    it('TCUR02 - має повернути дані поточного співробітника з req.user', async () => {
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

    it('TCUR03 - має повернути помилку 404, якщо req.user відсутній', async () => {
        mockReq.user = null;

        await getCurrentEmployee(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Користувача не знайдено (внутрішня помилка)" });
    });
});

// Тести для updateAdminProfile 
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

        userModel.findByIdAndUpdate.mockImplementation(() => ({
            select: mockSelect
        }));
    });

    it('TCUW15 - має успішно оновити профіль адміністратора', async () => {
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

    test.each([
        ['firstName', "Будь ласка, введіть ім'я"],
        ['secondName', "Будь ласка, введіть прізвище"],
        ['middleName', "Будь ласка, введіть по батькові"],
        ['phoneNumber', "Будь ласка, введіть номер телефону"],
        ['birthDate', "Будь ласка, введіть дату народження"],
    ])('TCUW16 - має повернути помилку, якщо %s відсутнє', async (field, expectedMessage) => {
        delete mockReq.body[field];
        await updateAdminProfile(mockReq, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: expectedMessage });
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCUW13 - має повернути 404, якщо користувача (адміна) не знайдено для оновлення', async () => {
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

    it('TCUE03 - має повернути 500 при помилці бази даних', async () => {
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

// Тести для changePassword
describe('changePassword', () => {
    let mockReq;
    let mockRes;
    let mockSave;
    const userId = 'currentUser123';
    const oldPassword = 'oldPassword123';
    const newPassword = 'newPasswordSecure';
    const userHashedPassword = 'hashedOldPassword';

    beforeEach(() => {
        mockReq = {
            user: { _id: userId },
            body: {
                oldPassword: oldPassword,
                newPassword: newPassword,
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };

        mockSave = jest.fn().mockResolvedValue(true);

        userModel.findById.mockResolvedValue({
            _id: userId,
            password: userHashedPassword,
            save: mockSave,
        });

        bcrypt.compare.mockResolvedValue(true);
        bcrypt.genSalt.mockResolvedValue('randomSalt');
        bcrypt.hash.mockResolvedValue('hashedNewPassword');
    });

    it('TCUW17 - має успішно змінити пароль з валідними даними', async () => {
        await changePassword(mockReq, mockRes);

        // Перевірка пошуку користувача
        expect(userModel.findById).toHaveBeenCalledWith(userId);
        // Перевірка порівняння старого пароля
        expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, userHashedPassword);
        // Перевірка генерації солі та хешування нового пароля
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 'randomSalt');
        // Перевірка виклику збереження користувача
        expect(mockSave).toHaveBeenCalledTimes(1);
        // Перевірка відповіді
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Пароль успішно змінено" });
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('TCUW18 - має повернути 400, якщо не передано старий пароль', async () => {
        delete mockReq.body.oldPassword;
        await changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Старий та новий паролі обов'язкові" });
        expect(userModel.findById).not.toHaveBeenCalled();
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCUW18 - має повернути 400, якщо не передано новий пароль', async () => {
        delete mockReq.body.newPassword;
        await changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Старий та новий паролі обов'язкові" });
        expect(userModel.findById).not.toHaveBeenCalled();
    });

    it('TCUW19 - має повернути 400, якщо новий пароль закороткий (< 8 символів)', async () => {
        mockReq.body.newPassword = '1234567';
        await changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Новий пароль має містити щонайменше 8 символів" });
        expect(userModel.findById).not.toHaveBeenCalled();
    });

    it('TCUW13 - має повернути 404, якщо користувача не знайдено', async () => {
        userModel.findById.mockResolvedValue(null);
        await changePassword(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Користувача не знайдено" });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCUW20 - має повернути 400, якщо старий пароль невірний', async () => {
        bcrypt.compare.mockResolvedValue(false);
        await changePassword(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, userHashedPassword);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Невірний старий пароль" });
        expect(bcrypt.genSalt).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCUE03 - має повернути 500 при помилці findById', async () => {
        const dbError = new Error('FindById Error');
        userModel.findById.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await changePassword(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка зміни пароля:", dbError);
        consoleSpy.mockRestore();
    });

    it('TCUE02 - має повернути 500 при помилці bcrypt.compare', async () => {
        const bcryptError = new Error('Compare Error');
        bcrypt.compare.mockRejectedValue(bcryptError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await changePassword(mockReq, mockRes);

        expect(bcrypt.compare).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка зміни пароля:", bcryptError);
        consoleSpy.mockRestore();
    });

    it('TCUE04 - має повернути 500 при помилці bcrypt.genSalt', async () => {
        const saltError = new Error('Salt Error');
        bcrypt.genSalt.mockRejectedValue(saltError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await changePassword(mockReq, mockRes);

        expect(bcrypt.genSalt).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка зміни пароля:", saltError);
        consoleSpy.mockRestore();
    });

    it('TCUE05 - має повернути 500 при помилці bcrypt.hash', async () => {
        const hashError = new Error('Hash Error');
        bcrypt.hash.mockRejectedValue(hashError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await changePassword(mockReq, mockRes);

        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка зміни пароля:", hashError);
        consoleSpy.mockRestore();
    });

    it('TCUE06 - має повернути 500 при помилці user.save', async () => {
        const saveError = new Error('Save Error');
        mockSave.mockRejectedValue(saveError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await changePassword(mockReq, mockRes);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка зміни пароля:", saveError);
        consoleSpy.mockRestore();
    });
});
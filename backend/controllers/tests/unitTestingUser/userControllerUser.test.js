import userModel from "../../../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

import {
    loginUser,
    registerUser,
    checkUserRole,
    changePassword,
    getCurrentUser,
    updateClientProfile,
    // createToken is internal, we test it implicitly via login/register or mock jwt.sign directly
} from "../../userController.js"; // Adjust path as needed

// --- Mocking Dependencies ---
jest.mock("../../../models/userModel.js");
jest.mock("jsonwebtoken");
jest.mock("bcrypt");
jest.mock("validator");

// --- Global Test Setup ---
const mockSecret = "test-secret";
process.env.JWT_SECRET = mockSecret; // Set JWT Secret for tests

// ----- Tests for loginUser -----
describe("loginUser", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                email: "test@example.com",
                password: "password123",
            },
        };
        res = {
            json: jest.fn(),
        };
        // Clear mocks
        userModel.findOne.mockClear();
        bcrypt.compare.mockClear();
        jwt.sign.mockClear();
    });

    it("повинен успішно авторизувати існуючого активного користувача", async () => {
        const mockUser = {
            _id: "user123",
            email: "test@example.com",
            password: "hashedPassword",
            role: "користувач", // User role
            isActive: true,      // Active
            firstName: "Тест",
            secondName: "Юзер",
            middleName: "Тестович",
        };
        const mockToken = "mockToken123";

        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true); // Password matches
        jwt.sign.mockReturnValue(mockToken);

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
        expect(jwt.sign).toHaveBeenCalledWith(
            { id: "user123", role: "користувач" },
            mockSecret,
            { expiresIn: '1d' }
        );
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            token: mockToken,
            role: "користувач",
            firstName: "Тест",
            secondName: "Юзер",
            middleName: "Тестович",
        });
    });

    it("повинен повернути 'Такого користувача не існує', якщо email не знайдено", async () => {
        userModel.findOne.mockResolvedValue(null); // User not found

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Такого користувача не існує" });
    });

    it("повинен повернути 'Некоректні дані', якщо пароль не співпадає", async () => {
        const mockUser = {
            _id: "user123",
            email: "test@example.com",
            password: "hashedPassword",
            role: "користувач",
            isActive: true,
        };
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false); // Password does not match

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Некоректні дані" });
    });

     it("повинен повернути 'Ваш акаунт неактивний' для неактивного співробітника", async () => {
        const mockUser = {
            _id: "emp456",
            email: "employee@example.com",
            password: "hashedPassword",
            role: "адміністратор", // Employee role
            isActive: false, // INACTIVE employee
        };
        req.body.email = "employee@example.com"; // Adjust email for this test

        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true); // Assume password matches for testing the active check

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "employee@example.com" });
        expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword"); // Still check password
         expect(jwt.sign).not.toHaveBeenCalled(); // Token should NOT be created
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Ваш акаунт неактивний" });
    });

      it("повинен успішно авторизувати АКТИВНОГО співробітника", async () => {
        const mockUser = {
            _id: "emp789",
            email: "active_emp@example.com",
            password: "hashedPassword",
            role: "комірник", // Employee role
            isActive: true,      // ACTIVE employee
            firstName: "Активний",
            secondName: "Працівник",
            middleName: "Іванович"
        };
         req.body.email = "active_emp@example.com";
         const mockToken = "mockTokenEmp";

        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true); // Password matches
        jwt.sign.mockReturnValue(mockToken);


        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "active_emp@example.com" });
        expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashedPassword");
        expect(jwt.sign).toHaveBeenCalledWith(
             { id: "emp789", role: "комірник" },
            mockSecret,
            { expiresIn: '1d' }
        );
         expect(res.json).toHaveBeenCalledWith({
             success: true,
             token: mockToken,
             role: "комірник",
             firstName: "Активний",
             secondName: "Працівник",
             middleName: "Іванович",
         });
    });


    it("повинен повернути 'Помилка сервера', якщо findOne викидає помилку", async () => {
        const dbError = new Error("DB connection error");
        userModel.findOne.mockRejectedValue(dbError);

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
    });

    it("повинен повернути 'Помилка сервера', якщо bcrypt.compare викидає помилку", async () => {
        const mockUser = { _id: "user123", password: "hashedPassword", role: "користувач", isActive: true };
        const bcryptError = new Error("Bcrypt error");
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockRejectedValue(bcryptError);

        await loginUser(req, res);

        expect(userModel.findOne).toHaveBeenCalled();
        expect(bcrypt.compare).toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
    });
});

// ----- Tests for registerUser -----
describe("registerUser", () => {
    let req, res, mockUserInstance;

    beforeEach(() => {
        req = {
            body: {
                firstName: "New",
                secondName: "User",
                middleName: "Testovich",
                email: "new@example.com",
                phoneNumber: "0991234567",
                password: "newpassword123",
            }
        };
        res = {
            json: jest.fn(),
        };

         mockUserInstance = {
             _id: "newUser456",
             firstName: req.body.firstName,
             secondName: req.body.secondName,
             middleName: req.body.middleName,
             email: req.body.email,
             role: "користувач",
             save: jest.fn() // Mock the save method
        };

        // Clear mocks
        userModel.findOne.mockClear();
        validator.isEmail.mockClear();
        bcrypt.genSalt.mockClear();
        bcrypt.hash.mockClear();
        userModel.mockClear(); // Clear constructor mock
         mockUserInstance.save.mockClear();
        jwt.sign.mockClear();


        // Setup default valid mocks
        userModel.findOne.mockResolvedValue(null); // Assume user doesn't exist
        validator.isEmail.mockReturnValue(true);   // Assume email is valid
        bcrypt.genSalt.mockResolvedValue("randomSalt");
        bcrypt.hash.mockResolvedValue("hashedNewPassword");
        userModel.mockImplementation(() => mockUserInstance); // Mock constructor
         mockUserInstance.save.mockResolvedValue(mockUserInstance); // Mock successful save
         jwt.sign.mockReturnValue("mockNewToken"); // Mock token generation
    });

    it("повинен успішно зареєструвати нового користувача", async () => {
        await registerUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "new@example.com" });
        expect(validator.isEmail).toHaveBeenCalledWith("new@example.com");
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", "randomSalt");
         // Check constructor call with correct data
        expect(userModel).toHaveBeenCalledWith({
             firstName: "New",
             secondName: "User",
             middleName: "Testovich",
             email: "new@example.com",
             phoneNumber: "0991234567",
             password: "hashedNewPassword",
             role: "користувач" // Check role is set correctly
        });
        expect(mockUserInstance.save).toHaveBeenCalledTimes(1);
        expect(jwt.sign).toHaveBeenCalledWith(
            { id: "newUser456", role: "користувач" },
            mockSecret,
            { expiresIn: '1d' } // Assuming createToken adds expires in
        );
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            token: "mockNewToken",
            role: "користувач",
             firstName: "New",
             secondName: "User",
             middleName: "Testovich"
        });
    });

     it("повинен повернути 'Такий користувач вже існує', якщо email вже зайнято", async () => {
        userModel.findOne.mockResolvedValue({ email: "new@example.com" }); // Simulate user exists

        await registerUser(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "new@example.com" });
        expect(validator.isEmail).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
         expect(userModel).not.toHaveBeenCalled(); // Constructor should not be called
        expect(mockUserInstance.save).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Такий користувач вже існує" });
    });

     // Тести для всіх відсутніх полів
     test.each([
         ['firstName', "Будь ласка, введіть ім'я"],
         ['secondName', "Будь ласка, введіть прізвище"],
         ['middleName', "Будь ласка, введіть по батькові"],
         ['email', "Будь ласка, введіть електронну пошту"],
         ['phoneNumber', "Будь ласка, введіть номер телефону"],
         ['password', "Будь ласка, введіть пароль"],
     ])('повинен повернути помилку, якщо %s відсутнє', async (field, message) => {
        delete req.body[field];
         await registerUser(req, res);
         expect(res.json).toHaveBeenCalledWith({ success: false, message });
         expect(userModel).not.toHaveBeenCalled();
         expect(mockUserInstance.save).not.toHaveBeenCalled();
     });

    it("повинен повернути 'Будь ласка, введіть коректну адресу...', якщо email невалідний", async () => {
        validator.isEmail.mockReturnValue(false); // Simulate invalid email

        await registerUser(req, res);

        expect(userModel.findOne).toHaveBeenCalled(); // Should still check existence
        expect(validator.isEmail).toHaveBeenCalledWith("new@example.com");
         expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(userModel).not.toHaveBeenCalled();
        expect(mockUserInstance.save).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, введіть коректну адресу електронної пошти" });
    });

    it("повинен повернути 'Пароль має містити щонайменше 8 символів', якщо пароль закороткий", async () => {
        req.body.password = "1234567"; // Too short

        await registerUser(req, res);

        expect(userModel.findOne).toHaveBeenCalled();
        expect(validator.isEmail).toHaveBeenCalled(); // Should validate email before password length
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(userModel).not.toHaveBeenCalled();
        expect(mockUserInstance.save).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Пароль має містити щонайменше 8 символів" });
    });


    it("повинен повернути 'Помилка', якщо findOne викидає помилку", async () => {
        const dbError = new Error("DB find error");
        userModel.findOne.mockRejectedValue(dbError);

        await registerUser(req, res);

        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
    });

     it("повинен повернути 'Помилка', якщо save викидає помилку", async () => {
        const saveError = new Error("DB save error");
         mockUserInstance.save.mockRejectedValue(saveError); // Simulate save failure

        await registerUser(req, res);

         expect(userModel.findOne).toHaveBeenCalled();
         expect(validator.isEmail).toHaveBeenCalled();
         expect(bcrypt.hash).toHaveBeenCalled();
         expect(userModel).toHaveBeenCalled(); // Constructor called
         expect(mockUserInstance.save).toHaveBeenCalledTimes(1); // Save attempted
         expect(jwt.sign).not.toHaveBeenCalled(); // Token not created
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
    });
});


// ----- Tests for checkUserRole -----
describe('checkUserRole', () => {
    let req, res;
    const userIdFromToken = 'userCheckId';

    beforeEach(() => {
        // Симулюємо додавання req.user мідлвером
        req = {
            user: { _id: userIdFromToken }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        userModel.findById.mockClear();
    });

    it('повинен успішно повернути роль користувача', async () => {
        const mockUser = { _id: userIdFromToken, role: 'користувач' };
        userModel.findById.mockResolvedValue(mockUser);

        await checkUserRole(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, role: 'користувач' });
    });

    it('повинен повернути роль "адміністратор", якщо користувач адміністратор', async () => {
        const mockAdmin = { _id: userIdFromToken, role: 'адміністратор' };
        userModel.findById.mockResolvedValue(mockAdmin);

        await checkUserRole(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, role: 'адміністратор' });
    });

     it('повинен повернути 404, якщо користувач не знайдений', async () => {
        userModel.findById.mockResolvedValue(null); // Simulate user not found

        await checkUserRole(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Користувача не знайдено' });
    });

     it('повинен повернути 500 при помилці бази даних', async () => {
        const dbError = new Error('DB lookup failed');
        userModel.findById.mockRejectedValue(dbError);

        await checkUserRole(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Помилка сервера' });
    });

     it('повинен повернути 500, якщо req.user не містить _id (теоретично)', async () => {
        req.user = {}; // Видаляємо _id
        // userModel.findById(undefined) може видати помилку, але краще перехопити раніше, якщо можливо
         // Поточний код не робить цієї перевірки, але залежить від findById(undefined)

        // Давайте симулюємо, що findById(undefined) видасть помилку
         const undefinedIdError = new Error('Cast to ObjectId failed for value "undefined"');
         userModel.findById.mockRejectedValue(undefinedIdError);


        await checkUserRole(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(undefined);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Помилка сервера' });
    });
});

// ----- Tests for changePassword -----
describe('changePassword', () => {
    let req, res, mockUser;
    const userIdFromToken = 'passChangeUser';
    const oldPassword = 'oldPassword123';
    const newPassword = 'newPassword1234';
    const correctOldHash = 'hashedOldPassword';

    beforeEach(() => {
        req = {
            user: { _id: userIdFromToken }, // З токена
            body: {
                oldPassword: oldPassword,
                newPassword: newPassword
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        // Mock користувача, що повертається findById, з методом save
        mockUser = {
            _id: userIdFromToken,
            password: correctOldHash,
            save: jest.fn(), // Мок для save
        };

        // Clear mocks
        userModel.findById.mockClear();
        bcrypt.compare.mockClear();
        bcrypt.genSalt.mockClear();
        bcrypt.hash.mockClear();
        mockUser.save.mockClear(); // Очистка моку save


         // Default valid mocks
        userModel.findById.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true); // Assume old password matches
        bcrypt.genSalt.mockResolvedValue("newSalt");
        bcrypt.hash.mockResolvedValue("hashedNewPassword");
        mockUser.save.mockResolvedValue(true); // Assume save succeeds
    });

    it('повинен успішно змінити пароль з вірними даними', async () => {
        await changePassword(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, correctOldHash);
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, "newSalt");
        expect(mockUser.password).toBe("hashedNewPassword"); // Check if password property was updated
        expect(mockUser.save).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Пароль успішно змінено' });
         expect(res.status).not.toHaveBeenCalled(); // Status 200 (default)
    });

     it('повинен повернути 400, якщо старий пароль відсутній', async () => {
        delete req.body.oldPassword;
        await changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Старий та новий паролі обов\'язкові' });
         expect(userModel.findById).not.toHaveBeenCalled();
    });

     it('повинен повернути 400, якщо новий пароль відсутній', async () => {
        delete req.body.newPassword;
        await changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Старий та новий паролі обов\'язкові' });
        expect(userModel.findById).not.toHaveBeenCalled();
    });

     it('повинен повернути 400, якщо новий пароль закороткий', async () => {
        req.body.newPassword = 'short';
        await changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Новий пароль має містити щонайменше 8 символів' });
        expect(userModel.findById).not.toHaveBeenCalled();
    });


     it('повинен повернути 404, якщо користувача не знайдено', async () => {
        userModel.findById.mockResolvedValue(null); // Simulate user not found

        await changePassword(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
         expect(bcrypt.compare).not.toHaveBeenCalled();
         expect(mockUser.save).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Користувача не знайдено' });
    });

    it('повинен повернути 400, якщо старий пароль невірний', async () => {
        bcrypt.compare.mockResolvedValue(false); // Simulate wrong old password

        await changePassword(req, res);

        expect(userModel.findById).toHaveBeenCalledWith(userIdFromToken);
        expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, correctOldHash);
        expect(bcrypt.hash).not.toHaveBeenCalled(); // New password not hashed
        expect(mockUser.save).not.toHaveBeenCalled(); // Save not called
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Невірний старий пароль' });
    });


     it('повинен повернути 500 при помилці findById', async () => {
        const dbError = new Error('DB Find Error');
        userModel.findById.mockRejectedValue(dbError);

        await changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Помилка сервера' });
    });

      it('повинен повернути 500 при помилці bcrypt.compare', async () => {
        const bcryptError = new Error('Compare Error');
        bcrypt.compare.mockRejectedValue(bcryptError);

        await changePassword(req, res);
        expect(userModel.findById).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Помилка сервера' });
    });


     it('повинен повернути 500 при помилці save', async () => {
        const saveError = new Error('Save Error');
        mockUser.save.mockRejectedValue(saveError); // Simulate save failure

        await changePassword(req, res);

        expect(userModel.findById).toHaveBeenCalled();
        expect(bcrypt.compare).toHaveBeenCalled(); // Old pass checked
        expect(bcrypt.hash).toHaveBeenCalled(); // New pass hashed
         expect(mockUser.save).toHaveBeenCalledTimes(1); // Save attempted
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Помилка сервера' });
    });
});


// ----- Tests for getCurrentUser -----
describe('getCurrentUser', () => {
    let req, res;
    const mockUserDataFromToken = {
        _id: 'client123',
        firstName: 'Ім\'я',
        secondName: 'Прізвище',
        middleName: 'По-батькові',
        email: 'client@mail.com',
        phoneNumber: '0501112233',
        birthDate: new Date('1990-05-15'),
        region: 'Київська',
        city: 'Київ',
        street: 'Вулиця',
        houseNumber: '10',
        apartmentNumber: '5',
        postalCode: '01234',
        // role: 'користувач' - не повертається цим ендпоінтом
        // password: - не повертається цим ендпоінтом
        // registrationDate: - закоментовано у коді ендпоінта
    };

    beforeEach(() => {
        req = {
            user: mockUserDataFromToken // Дані користувача вже є в req.user від middleware
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('повинен успішно повернути дані поточного клієнта', async () => {
        await getCurrentUser(req, res);

        expect(res.status).not.toHaveBeenCalled(); // Should be 200 OK default
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            userData: { // Точно та структура, яку повертає контролер
                id: 'client123',
                firstName: 'Ім\'я',
                secondName: 'Прізвище',
                middleName: 'По-батькові',
                email: 'client@mail.com',
                phoneNumber: '0501112233',
                birthDate: new Date('1990-05-15'),
                region: 'Київська',
                city: 'Київ',
                street: 'Вулиця',
                houseNumber: '10',
                apartmentNumber: '5',
                postalCode: '01234'
            }
        });
    });

    it('повинен повернути 404, якщо req.user відсутній (мало б бути перехоплено middleware)', async () => {
        req.user = null; // Симулюємо відсутність даних користувача

        await getCurrentUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Користувача не знайдено (внутрішня помилка)' });
    });

});

// ----- Tests for updateClientProfile -----
describe('updateClientProfile', () => {
    let req, res;
    const userIdFromToken = 'clientUpdateId';

    beforeEach(() => {
        req = {
            user: { _id: userIdFromToken }, // ID з токена
            body: { // Дані для оновлення
                firstName: 'Оновлене',
                secondName: 'ПрізвищеК',
                middleName: 'Оновленевич',
                phoneNumber: '0979876543',
                birthDate: '1985-03-20', // рядок, як часто приходить з форми
                region: 'Львівська',
                city: 'Львів',
                street: 'Нова',
                houseNumber: '25',
                apartmentNumber: '1',
                postalCode: '79000'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

         // Мок для findByIdAndUpdate().select()
         const mockUpdatedUser = {
            _id: userIdFromToken,
            firstName: 'Оновлене',
            secondName: 'ПрізвищеК',
            middleName: 'Оновленевич',
             email: 'original@mail.com', // email не оновлюється
             phoneNumber: '0979876543',
             birthDate: new Date('1985-03-20T00:00:00.000Z'), // Mongoose поверне Date об'єкт
             region: 'Львівська',
             city: 'Львів',
             street: 'Нова',
             houseNumber: '25',
             apartmentNumber: '1',
             postalCode: '79000'
        };

        userModel.findByIdAndUpdate = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUpdatedUser) // Повертаємо об'єкт без пароля/кошика/обраного
        });


        // Clear mocks
        userModel.findByIdAndUpdate.mockClear();
         if(userModel.findByIdAndUpdate.mock.results[0]?.value?.select){
            userModel.findByIdAndUpdate.mock.results[0].value.select.mockClear();
         }
        res.status.mockClear();
        res.json.mockClear();
    });

    it('повинен успішно оновити профіль клієнта', async () => {
        await updateClientProfile(req, res);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userIdFromToken,
            expect.objectContaining({ // Перевіряємо, що об'єкт оновлення містить дані
                firstName: 'Оновлене',
                secondName: 'ПрізвищеК',
                middleName: 'Оновленевич',
                phoneNumber: '0979876543',
                 birthDate: expect.any(Date), // Контролер перетворює рядок на Date
                 region: 'Львівська',
                 city: 'Львів',
                 street: 'Нова',
                 houseNumber: '25',
                 apartmentNumber: '1',
                 postalCode: '79000'
            }),
             { new: true, runValidators: true } // Опції
        );
        expect(userModel.findByIdAndUpdate().select).toHaveBeenCalledWith('-password -cartData -favourites');
         expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
             success: true,
             message: "Профіль успішно оновлено",
             userData: expect.objectContaining({
                firstName: 'Оновлене',
                 phoneNumber: '0979876543',
                 postalCode: '79000'
                //... інші оновлені поля
            })
         }));
    });

    // Тести на відсутність обов'язкових полів
     test.each([
         ['firstName', "Будь ласка, введіть ім'я"],
         ['secondName', "Будь ласка, введіть прізвище"],
         ['middleName', "Будь ласка, введіть по батькові"],
         ['phoneNumber', "Будь ласка, введіть номер телефону"]
     ])('повинен повернути 400, якщо %s відсутнє', async (field, message) => {
         delete req.body[field];
         await updateClientProfile(req, res);

         expect(res.status).toHaveBeenCalledWith(400);
         expect(res.json).toHaveBeenCalledWith({ success: false, message });
         expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
     });

    it('повинен повернути 404, якщо findByIdAndUpdate не знаходить користувача', async () => {
        userModel.findByIdAndUpdate().select.mockResolvedValue(null); // Симулюємо не знайденого юзера

        await updateClientProfile(req, res);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Користувача не знайдено' });
    });

    it('повинен повернути 500 при помилці бази даних', async () => {
        const dbError = new Error('Update failed');
        userModel.findByIdAndUpdate().select.mockRejectedValue(dbError); // Симулюємо помилку БД

        await updateClientProfile(req, res);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
         expect(userModel.findByIdAndUpdate().select).toHaveBeenCalled(); // .select() теж викликається
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
             success: false,
             message: 'Помилка сервера при оновленні профілю',
             error: dbError.message
        }));
    });

     it('повинен повернути 400 при помилці валідації Mongoose', async () => {
        const validationError = new Error('Validation failed');
         validationError.name = 'ValidationError';
         validationError.errors = { // Типова структура помилки Mongoose
            phoneNumber: { message: 'Невірний формат номера телефону' }
        };
         userModel.findByIdAndUpdate().select.mockRejectedValue(validationError);

        await updateClientProfile(req, res);

        expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
         expect(userModel.findByIdAndUpdate().select).toHaveBeenCalled();
         expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Помилка валідації даних',
            errors: ['Невірний формат номера телефону'] // Масив повідомлень
        });
    });
});
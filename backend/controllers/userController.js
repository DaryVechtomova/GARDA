// import userModel from "../models/userModel.js";
// import jwt from "jsonwebtoken"
// import bcrypt from "bcrypt"
// import validator from "validator"
const userModel = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validator = require("validator");

//login user (для всіх)
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.json({ success: false, message: "Некоректні дані" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Такого користувача не існує" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Некоректні дані" });
        }

        // Якщо це співробітник і він звільнений, забороняємо вхід
        if (user.role !== "користувач" && !user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Ваш акаунт неактивний"
            });
        }

        const token = createToken(user._id, user.role);
        //localStorage.setItem("role", response.data.role);
        res.json({
            success: true,
            token,
            role: user.role,
            firstName: user.firstName,
            secondName: user.secondName,
            middleName: user.middleName
        });


    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: "Помилка сервера" });
    }
};


const createToken = (userId, userRole) => { // Приймає ID та РОЛЬ
    const payload = {
        id: userId,
        role: userRole
    };
    // Додаємо термін дії, наприклад, 1 день (в секундах)
    const expiresIn = '1d'; // '1h', '7d', '30m' і т.д.

    // Підписуємо токен з payload та терміном дії
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// реєстрація клієнта (для користувача)
const registerUser = async (req, res) => {
    const { firstName, secondName, middleName, email, phoneNumber, password } = req.body;
    try {
        // checking is user already exists
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "Такий користувач вже існує" })
        }

        // Перевірка на обов'язкові поля
        if (!firstName) {
            return res.json({ success: false, message: "Будь ласка, введіть ім'я" });
        }
        if (!secondName) {
            return res.json({ success: false, message: "Будь ласка, введіть прізвище" });
        }
        if (!middleName) {
            return res.json({ success: false, message: "Будь ласка, введіть по батькові" });
        }
        if (!email) {
            return res.json({ success: false, message: "Будь ласка, введіть електронну пошту" });
        }
        if (!phoneNumber) {
            return res.json({ success: false, message: "Будь ласка, введіть номер телефону" });
        }
        if (!password) {
            return res.json({ success: false, message: "Будь ласка, введіть пароль" });
        }
        const role = "користувач";

        // Перевірка формату електронної пошти
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Будь ласка, введіть коректну адресу електронної пошти" });
        }

        // Перевірка довжини пароля
        if (password.length < 8) {
            return res.json({ success: false, message: "Пароль має містити щонайменше 8 символів" });
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            firstName,
            secondName,
            middleName,
            email,
            phoneNumber,
            password: hashedPassword,
            role
        });

        const user = await newUser.save()
        const token = createToken(user._id, user.role);
        res.json({
            success: true,
            token,
            role: user.role,
            firstName: user.firstName,
            secondName: user.secondName,
            middleName: user.middleName
        });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

// Отримання списку співробітників (для адміна)
const listEmployees = async (req, res) => {
    try {
        const employees = await userModel.find({ role: { $in: ["адміністратор", "комірник", "менеджер з продажу"] } })
            .select('-password');
        res.json({ success: true, data: employees });
    } catch (error) {
        console.log(error); // <-- має бути саме Error, а не error.message
        return res.status(500).json({
            success: false,
            message: "Помилка сервера",
        });
    }
};

// реєстрація співробітника (для адміна)
const registerEmployee = async (req, res) => {
    const { firstName, secondName, middleName, email, phoneNumber, password, birthDate, role } = req.body;

    try {
        // Перевірка, чи існує користувач з такою поштою
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "Такий користувач вже існує" });
        }

        // Перевірка довжини пароля
        if (password.length < 8) {
            return res.json({ success: false, message: "Пароль має містити щонайменше 8 символів" });
        }

        // Перевірка на обов'язкові поля
        if (!firstName) {
            return res.json({ success: false, message: "Будь ласка, введіть ім'я" });
        }
        if (!secondName) {
            return res.json({ success: false, message: "Будь ласка, введіть прізвище" });
        }
        if (!middleName) {
            return res.json({ success: false, message: "Будь ласка, введіть по батькові" });
        }
        if (!email) {
            return res.json({ success: false, message: "Будь ласка, введіть електронну пошту" });
        }
        if (!phoneNumber) {
            return res.json({ success: false, message: "Будь ласка, введіть номер телефону" });
        }
        if (!password) {
            return res.json({ success: false, message: "Будь ласка, введіть пароль" });
        }
        if (!birthDate) {
            return res.json({ success: false, message: "Будь ласка, введіть дату народження" });
        }
        if (!role) {
            return res.json({ success: false, message: "Будь ласка, оберіть роль" });
        }

        // Перевірка формату електронної пошти
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Будь ласка, введіть коректну адресу електронної пошти" });
        }

        // Хешування пароля
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Створення нового співробітника
        const newEmployee = new userModel({
            firstName,
            secondName,
            middleName,
            email,
            phoneNumber,
            password: hashedPassword,
            birthDate,
            role,
        });

        await newEmployee.save();
        res.json({
            success: true,
            message: "Співробітника успішно додано",
            data: newEmployee
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка сервера" });
    }
};

// редагування співробітника (для адміна)
const editEmployee = async (req, res) => {
    const {
        id,
        firstName,
        secondName,
        middleName,
        email,
        phoneNumber,
        birthDate,
        role,
    } = req.body;
    // Перевірка на обов'язкові поля
    if (!firstName) {
        return res.json({ success: false, message: "Будь ласка, введіть ім'я" });
    }
    if (!secondName) {
        return res.json({ success: false, message: "Будь ласка, введіть прізвище" });
    }
    if (!middleName) {
        return res.json({ success: false, message: "Будь ласка, введіть по батькові" });
    }
    if (!email) {
        return res.json({ success: false, message: "Будь ласка, введіть електронну пошту" });
    }
    if (!phoneNumber) {
        return res.json({ success: false, message: "Будь ласка, введіть номер телефону" });
    }
    if (!birthDate) {
        return res.json({ success: false, message: "Будь ласка, введіть дату народження" });
    }

    // Створення нового співробітника
    const updateData = {
        firstName,
        secondName,
        middleName,
        email,
        phoneNumber,
        birthDate,
        role,
    };

    try {
        // Перевірка на дублікат email (крім поточного користувача)
        const existingUser = await userModel.findOne({
            email: email,
            _id: { $ne: id } // Виключаємо поточного користувача з перевірки
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Користувач з такою електронною поштою вже існує"
            });
        }
        const updatedEmployee = await userModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedEmployee) {
            return res.status(404).json({ success: false, message: "Співробітника не знайдено" });
        }
        res.json({
            success: true,
            message: "Співробітника успішно оновлено",
            data: updatedEmployee
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка сервера" });
    }
};

// звільнити співробітника (для адміна)
const fireEmployee = async (req, res) => {
    const { id } = req.body;
    try {
        const user = await userModel.findById(id);
        if (!user || user.role === "користувач") {
            return res.status(404).json({ success: false, message: "Співробітника не знайдено" });
        }

        user.fireDate = new Date();
        user.isActive = false;
        await user.save();

        res.json({ success: true, message: "Співробітника звільнено" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

// отримання даних співнобітника (для адміна)
const getCurrentEmployee = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено (внутрішня помилка)" });
        }

        res.json({
            success: true,
            userData: {
                id: user._id,
                firstName: user.firstName,
                secondName: user.secondName,
                middleName: user.middleName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                birthDate: user.birthDate,
                role: user.role,
                hireDate: user.hireDate
            }
        });

    } catch (error) {
        console.error("Помилка отримання даних поточного користувача:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при отриманні даних користувача" });
    }
};

const checkUserRole = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }
        res.status(200).json({
            success: true,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

// оновлення профіля співробітників (для адміна)
const updateAdminProfile = async (req, res) => {
    const userId = req.user._id; // Беремо ID з токена
    const { firstName, secondName, middleName, phoneNumber, birthDate } = req.body;

    if (!firstName) {
        return res.json({ success: false, message: "Будь ласка, введіть ім'я" });
    }
    if (!secondName) {
        return res.json({ success: false, message: "Будь ласка, введіть прізвище" });
    }
    if (!middleName) {
        return res.json({ success: false, message: "Будь ласка, введіть по батькові" });
    }
    if (!phoneNumber) {
        return res.json({ success: false, message: "Будь ласка, введіть номер телефону" });
    }
    if (!birthDate) {
        return res.json({ success: false, message: "Будь ласка, введіть дату народження" });
    }

    try {
        const updatedUser = await userModel.findByIdAndUpdate(userId, {
            firstName,
            secondName,
            middleName,
            phoneNumber,
            birthDate
        }, { new: true }).select('-password'); // Оновлюємо і повертаємо без пароля

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        res.json({ success: true, message: "Профіль оновлено", updatedUser }); // Повертаємо оновлені дані

    } catch (error) {
        console.error("Помилка оновлення профілю:", error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

// Зміна пароля поточного користувача (для всіх)
const changePassword = async (req, res) => {
    const userId = req.user._id; // ID з токена
    const { oldPassword, newPassword } = req.body;

    // Валідація
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Старий та новий паролі обов'язкові" });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Новий пароль має містити щонайменше 8 символів" });
    }

    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        // Перевірка старого пароля
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Невірний старий пароль" });
        }

        // Хешування та збереження нового пароля
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Пароль успішно змінено" });

    } catch (error) {
        console.error("Помилка зміни пароля:", error);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
};

// отримання даних клієнта (для клієнтів)
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено (внутрішня помилка)" });
        }

        res.json({
            success: true,
            userData: {
                id: user._id,
                firstName: user.firstName,
                secondName: user.secondName,
                middleName: user.middleName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                birthDate: user.birthDate,
                region: user.region,
                city: user.city,
                street: user.street,
                houseNumber: user.houseNumber,
                apartmentNumber: user.apartmentNumber,
                postalCode: user.postalCode,
                //registrationDate: user.registrationDate,
            }
        });

    } catch (error) {
        console.error("Помилка отримання даних поточного користувача:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при отриманні даних користувача" });
    }
};

// Оновлення профілю клієнта (для самого клієнта)
const updateClientProfile = async (req, res) => {
    const userId = req.user._id; // Беремо ID з токена
    const {
        firstName,
        secondName,
        middleName,
        phoneNumber,
        birthDate,
        region,
        city,
        street,
        houseNumber,
        apartmentNumber,
        postalCode
    } = req.body;

    // Валідація обов'язкових полів
    if (!firstName) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть ім'я" });
    }
    if (!secondName) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть прізвище" });
    }
    if (!middleName) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть по батькові" });
    }
    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: "Будь ласка, введіть номер телефону" });
    }

    try {
        // Формуємо об'єкт для оновлення
        const updateData = {
            firstName,
            secondName,
            middleName,
            phoneNumber,
            ...(birthDate && { birthDate: new Date(birthDate) }), // Опціональне поле
            ...(region && { region }),
            ...(city && { city }),
            ...(street && { street }),
            ...(houseNumber && { houseNumber }),
            ...(apartmentNumber && { apartmentNumber }),
            ...(postalCode && { postalCode })
        };

        // Оновлюємо користувача
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -cartData -favourites');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Користувача не знайдено" });
        }

        res.json({
            success: true,
            message: "Профіль успішно оновлено",
            userData: {
                firstName: updatedUser.firstName,
                secondName: updatedUser.secondName,
                middleName: updatedUser.middleName,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                birthDate: updatedUser.birthDate,
                region: updatedUser.region,
                city: updatedUser.city,
                street: updatedUser.street,
                houseNumber: updatedUser.houseNumber,
                apartmentNumber: updatedUser.apartmentNumber,
                postalCode: updatedUser.postalCode
            }
        });

    } catch (error) {
        console.error("Помилка оновлення профілю:", error);

        // Обробка помилок валідації Mongoose
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Помилка валідації даних",
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Помилка сервера при оновленні профілю",
            error: error.message
        });
    }
};

module.exports = { loginUser, registerUser, listEmployees, registerEmployee, editEmployee, fireEmployee, getCurrentEmployee, checkUserRole, updateAdminProfile, changePassword, getCurrentUser, updateClientProfile };
// export { loginUser, registerUser, listEmployees, registerEmployee, editEmployee, fireEmployee, getCurrentEmployee, checkUserRole, updateAdminProfile, changePassword, getCurrentUser, updateClientProfile }
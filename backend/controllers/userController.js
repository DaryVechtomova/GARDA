import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import validator from "validator"

//login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
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
            return res.json({ success: false, message: "Ваш акаунт неактивний" });
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

//register user
const registerUser = async (req, res) => {
    const { firstName, secondName, middleName, email, phoneNumber, password } = req.body;
    try {

        console.log("slkvmslvkm");
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


        // hashing user password
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
        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })
    }
}

// Отримання списку співробітників
const listEmployees = async (req, res) => {
    try {
        const employees = await userModel.find({ role: { $in: ["адміністратор", "комірник"] } }); // Шукаємо користувачів з ролями "admin" або "storekeeper"
        res.json({ success: true, data: employees });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка сервера" });
    }
};

const registerEmployee = async (req, res) => {
    const { firstName, secondName, middleName, email, phoneNumber, password, birthDate, role } = req.body;

    try {
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

        // Перевірка довжини пароля
        if (password.length < 8) {
            return res.json({ success: false, message: "Пароль має містити щонайменше 8 символів" });
        }

        // Перевірка, чи існує користувач з такою поштою
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "Такий користувач вже існує" });
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
        res.json({ success: true, message: "Співробітника успішно додано" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка сервера" });
    }
};

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
        const updatedEmployee = await userModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedEmployee) {
            return res.status(404).json({ success: false, message: "Співробітника не знайдено" });
        }
        res.json({ success: true, message: "Співробітника успішно додано", data: updatedEmployee });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Помилка сервера" });
    }
};

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

const getCurrentUser = async (req, res) => {
    try {
        // Об'єкт користувача вже додано до req.user завдяки authMiddleware
        const user = req.user;

        // Можна додатково перевірити, але authMiddleware вже це зробив
        if (!user) {
            // Цей випадок не мав би виникнути, якщо authMiddleware спрацював
            return res.status(404).json({ success: false, message: "Користувача не знайдено (внутрішня помилка)" });
        }

        // Повертаємо необхідні дані (без пароля, бо його виключено в middleware)
        res.json({
            success: true,
            // Називаємо поле userData, як очікує фронтенд
            userData: {
                id: user._id,
                firstName: user.firstName,
                secondName: user.secondName,
                middleName: user.middleName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                // Додайте інші поля, які можуть бути потрібні адмінці
                // hireDate: user.hireDate,
                // isActive: user.isActive,
            }
        });

    } catch (error) {
        console.error("Помилка отримання даних поточного користувача:", error);
        res.status(500).json({ success: false, message: "Помилка сервера при отриманні даних користувача" });
    }
};

export { loginUser, registerUser, listEmployees, registerEmployee, editEmployee, fireEmployee, getCurrentUser, }
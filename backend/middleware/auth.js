// middleware/auth.js
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js'; // Переконайся, що шлях правильний

const authMiddleware = async (req, res, next) => {
    // 1. Отримуємо токен з Authorization хедера
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        // 401 Unauthorized - стандартний код для відсутності автентифікації
        return res.status(401).json({ success: false, message: 'Для виконання цієї дії необхідно авторизуватися' });
    }

    // Витягуємо сам токен
    const token = authorizationHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Для виконання цієї дії необхідно авторизуватися' });
    }

    try {
        // 2. Верифікуємо токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Знаходимо користувача в базі за ID з токена
        const user = await userModel.findById(decoded.id).select('-password'); // Виключаємо пароль

        if (!user) {
            // Якщо користувача з таким ID вже немає в базі
            return res.status(401).json({ success: false, message: 'Авторизація недійсна (користувача не знайдено)' });
        }

        // 4. Перевірка активності (якщо це співробітник)
        if (user.role !== 'користувач' && !user.isActive) {
            // 403 Forbidden - доступ заборонено, хоча автентифікація пройшла
            return res.status(403).json({ success: false, message: 'Ваш акаунт співробітника неактивний' });
        }

        // 5. Додаємо об'єкт користувача до запиту
        req.user = user; // Тепер req.user буде доступний далі (в adminMiddleware, контролерах)
        next(); // Переходимо до наступного middleware або контролера

    } catch (error) {
        console.error('Помилка верифікації токена:', error.name, error.message);
        let message = "Помилка авторизації";
        let statusCode = 401; // За замовчуванням Unauthorized

        if (error.name === 'TokenExpiredError') {
            message = 'Термін дії сесії закінчився. Будь ласка, увійдіть знову.';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Недійсний токен авторизації.';
        } else {
            // Інші можливі помилки (наприклад, проблеми з БД під час пошуку user)
            message = 'Внутрішня помилка сервера під час авторизації.';
            statusCode = 500; // Internal Server Error
            // Логуємо повну помилку для діагностики
            console.error(error);
        }

        return res.status(statusCode).json({ success: false, message: message });
    }
};

// Middleware для перевірки ролі (адміністратор або комірник)
// Цей middleware тепер працюватиме, бо authMiddleware встановлює req.user
const adminMiddleware = (req, res, next) => {
    const allowedRoles = ["адміністратор", "комірник"];

    // Перевіряємо, чи req.user існує (має бути встановлено authMiddleware)
    if (!req.user || !req.user.role) {
        // Це не повинно статись, якщо authMiddleware викликано першим
        console.error("adminMiddleware викликано без попередньої установки req.user authMiddleware");
        return res.status(500).json({ success: false, message: "Помилка конфігурації сервера" });
    }

    if (!allowedRoles.includes(req.user.role)) {
        // 403 Forbidden - доступ заборонено через недостатні права
        return res.status(403).json({ success: false, message: "Доступ заборонено (недостатньо прав)" });
    }
    next(); // Права є, йдемо далі
};

// Middleware тільки для адміністратора
const strictAdminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "адміністратор") {
        return res.status(403).json({
            success: false,
            message: "Доступ заборонено. Необхідні права адміністратора"
        });
    }
    next();
};

export { authMiddleware, adminMiddleware, strictAdminMiddleware }; // Експортуємо оновлене middleware
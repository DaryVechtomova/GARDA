import jwt from "jsonwebtoken"

const authMiddleware = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.json({ success: false, message: "Для виконання операції, будь ласка, авторизуйтесь" })
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET)
        req.body.userId = token_decode.id;
        next();
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Помилка" })

    }
};

// Middleware для перевірки ролі (адміністратор або комірник)
const adminMiddleware = (req, res, next) => {
    const allowedRoles = ["адміністратор", "комірник"];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Доступ заборонено" });
    }
    next();
};

export { authMiddleware, adminMiddleware };
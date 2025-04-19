// config/db.js
import mongoose from "mongoose";

export const connectDB = async () => {
    // Визначаємо URI для підключення
    // Якщо запущено тести (NODE_ENV === 'test'), використовуємо TEST_MONGO_URI,
    // інакше - основний MONGO_URI
    const mongoURI = process.env.NODE_ENV === 'test'
        ? process.env.TEST_MONGO_URI // Потрібно додати в .env.test або встановити іншим чином
        : process.env.MONGO_URI;     // Твій основний URI (з .env)

    // Перевірка, чи визначено URI
    if (!mongoURI) {
        const missingVar = process.env.NODE_ENV === 'test' ? 'TEST_MONGO_URI' : 'MONGO_URI';
        console.error(`ПОМИЛКА: Змінна середовища ${missingVar} не встановлена.`);
        console.error("Будь ласка, перевір свій .env або .env.test файл.");
        process.exit(1); // Зупиняємо процес, бо без БД працювати не можна
    }

    console.log(`Спроба підключення до: ${process.env.NODE_ENV === 'test' ? 'ТЕСТОВОЇ БД' : 'РОБОЧОЇ БД'}`);
    console.log(`URI: ${mongoURI.substring(0, mongoURI.indexOf('@'))}...`); // Логуємо частину URI для перевірки (без пароля)

    try {
        // Підключаємось до обраної бази даних
        await mongoose.connect(mongoURI);
        console.log(`DB Connected to ${process.env.NODE_ENV === 'test' ? 'TEST DB' : 'Production DB'}`);
    } catch (error) {
        console.error("ПОМИЛКА ПІДКЛЮЧЕННЯ ДО БД:", error);
        process.exit(1); // Зупиняємо при помилці підключення
    }
}
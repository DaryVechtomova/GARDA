const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.NODE_ENV === 'test'
        ? process.env.TEST_MONGO_URI
        : process.env.MONGO_URI;
    if (!mongoURI) {
        const missingVar = process.env.NODE_ENV === 'test' ? 'TEST_MONGO_URI' : 'MONGO_URI';
        console.error(`ПОМИЛКА: Змінна середовища ${missingVar} не встановлена.`);
        console.error("Будь ласка, перевір свій .env або .env.test файл.");
        process.exit(1);
    }
    console.log(`Спроба підключення до: ${process.env.NODE_ENV === 'test' ? 'ТЕСТОВОЇ БД' : 'РОБОЧОЇ БД'}`);
    console.log(`URI: ${mongoURI.substring(0, mongoURI.indexOf('@'))}...`);
    try {
        await mongoose.connect(mongoURI);
        console.log(`DB Connected to ${process.env.NODE_ENV === 'test' ? 'TEST DB' : 'Production DB'}`);
    } catch (error) {
        console.error("ПОМИЛКА ПІДКЛЮЧЕННЯ ДО БД:", error);
        process.exit(1);
    }
};

module.exports = { connectDB };

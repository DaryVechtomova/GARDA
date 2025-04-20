import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../../server.js'; // Переконайся, що шлях правильний
import User from '../../../models/userModel.js'; // Переконайся, що шлях правильний

let server;
let testUserToken; // Токен для тестового користувача
let testUserId; // ID тестового користувача
// Використаємо ту саму або іншу тестову БД
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_favourites';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests';

// --- Помічники (ті ж самі) ---
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

// Mock item IDs (можна ті ж самі, що й для кошика)
const ITEM_A_ID = 'itemA_12345';
const ITEM_B_ID = 'itemB_67890';

// --- Налаштування тестів (майже ідентичне) ---
beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    server = app.listen(0);
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests') {
        console.warn('Warning: Using fallback JWT secret for tests. Set JWT_SECRET environment variable.');
    }
});

afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Очищення колекції користувачів перед кожним тестом
    await User.deleteMany({});

    // Створення тестового користувача (з порожнім списком улюбленого)
    const hashedPassword = await hashPassword('testPassword123');
    const user = await User.create({
        firstName: 'Тест',
        secondName: 'ЮзерФев',
        middleName: 'Тестович',
        email: 'test.user.fav@example.com',
        phoneNumber: '9876543210',
        password: hashedPassword,
        role: 'користувач',
        isActive: true,
        birthDate: new Date('1999-12-12'),
        // Початково порожній список улюбленого
        cartData: {}, // також порожній, хоча не тестується тут
        favourites: {}, // Важливо!
    });
    testUserId = user._id;
    testUserToken = generateToken(testUserId, 'користувач');
});

// =======================================
// === Тести Favourite Controller ========
// =======================================

// --- POST /api/favourite/add ---
describe('POST /api/favourite/add', () => {
    it('TC_INT_FAV_01 - має успішно додати перший товар до улюблених (200 OK)', async () => {
        const response = await request(app)
            .post('/api/favourite/add') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Додано до улюблених"); // <-- Змінено повідомлення

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites).toBeDefined(); // <-- Змінено поле
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(1); // <-- Змінено поле
    });

    it('TC_INT_FAV_02 - має збільшити "кількість" існуючого товару в улюблених (200 OK)', async () => {
        // Примітка: Ваша логіка додає +1, навіть для улюблених. Тест це відображає.
        await User.findByIdAndUpdate(testUserId, { favourites: { [ITEM_A_ID]: 1 } }); // <-- Змінено поле

        const response = await request(app)
            .post('/api/favourite/add') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Додано до улюблених"); // <-- Змінено повідомлення


        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(2); // <-- Змінено поле (очікуємо 2 згідно логіки)
    });

     it('TC_INT_FAV_03 - має додати другий, інший товар до улюблених (200 OK)', async () => {
        await User.findByIdAndUpdate(testUserId, { favourites: { [ITEM_A_ID]: 1 } }); // <-- Змінено поле

        const response = await request(app)
            .post('/api/favourite/add') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_B_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Додано до улюблених"); // <-- Змінено повідомлення

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(1); // <-- Змінено поле
        expect(updatedUser.favourites[ITEM_B_ID]).toBe(1); // <-- Змінено поле
    });

    it('має повернути помилку, якщо userId не існує (200 OK, success: false)', async () => {
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/favourite/add') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: nonExistentUserId });

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/favourite/add') // <-- Змінено шлях
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(401);
    });
});

// --- POST /api/favourite/remove ---
describe('POST /api/favourite/remove', () => {
    beforeEach(async () => {
        // Додамо товари в улюблені для тестів видалення
        await User.findByIdAndUpdate(testUserId, {
            favourites: { // <-- Змінено поле
                [ITEM_A_ID]: 2, // Два товари А (згідно логіки додавання)
                [ITEM_B_ID]: 1  // Один товар B
            }
        });
    });

    it('TC_INT_FAV_04 - має успішно зменшити "кількість" товару в улюблених (200 OK)', async () => {
        const response = await request(app)
            .post('/api/favourite/remove') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Видалено з улюблених"); // <-- Змінено повідомлення

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(1); // <-- Змінено поле
        expect(updatedUser.favourites[ITEM_B_ID]).toBe(1); // <-- Змінено поле
    });

    it('TC_INT_FAV_05 - має встановити "кількість" товару в 0, якщо видаляється останній (200 OK)', async () => {
         // Примітка: Ваша логіка видалення робить -= 1.
        const response = await request(app)
            .post('/api/favourite/remove') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_B_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Видалено з улюблених"); // <-- Змінено повідомлення

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(2); // <-- Змінено поле
        expect(updatedUser.favourites[ITEM_B_ID]).toBe(0); // <-- Змінено поле (кількість стала 0)
    });

    it('TC_INT_FAV_06 - має повернути успіх, навіть якщо намагатись видалити товар, якого немає (200 OK)', async () => {
        const NON_EXISTENT_ITEM_ID = 'non_existent_item_777';
        const response = await request(app)
            .post('/api/favourite/remove') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: NON_EXISTENT_ITEM_ID, userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Видалено з улюблених"); // <-- Змінено повідомлення

        // Перевірка в БД
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.favourites[ITEM_A_ID]).toBe(2); // <-- Змінено поле
        expect(updatedUser.favourites[ITEM_B_ID]).toBe(1); // <-- Змінено поле
        expect(updatedUser.favourites[NON_EXISTENT_ITEM_ID]).toBeUndefined(); // <-- Змінено поле
    });

    it('має повернути помилку, якщо користувача не знайдено (200 OK, success: false)', async () => {
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/favourite/remove') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ itemId: ITEM_A_ID, userId: nonExistentUserId });

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

     it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/favourite/remove') // <-- Змінено шлях
            .send({ itemId: ITEM_A_ID, userId: testUserId });

        expect(response.statusCode).toBe(401);
    });
});

// --- POST /api/favourite/get ---
describe('POST /api/favourite/get', () => {
    it('TC_INT_FAV_07 - має успішно отримати список улюблених (200 OK)', async () => {
        const favContent = { [ITEM_A_ID]: 3, [ITEM_B_ID]: 1 }; // Приклад даних
        await User.findByIdAndUpdate(testUserId, { favourites: favContent }); // <-- Змінено поле

        const response = await request(app)
            .post('/api/favourite/get') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.favourites).toBeDefined(); // <-- Змінено поле
        expect(response.body.favourites).toEqual(favContent); // <-- Змінено поле
    });

     it('TC_INT_FAV_08 - має успішно отримати порожній список улюблених (200 OK)', async () => {
        const response = await request(app)
            .post('/api/favourite/get') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: testUserId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.favourites).toBeDefined(); // <-- Змінено поле
        expect(response.body.favourites).toEqual({}); // <-- Змінено поле
    });

    it('має повернути помилку, якщо користувача не знайдено (200 OK, success: false)', async () => {
         const nonExistentUserId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post('/api/favourite/get') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({ userId: nonExistentUserId });

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
    });

    it('має повернути 401, якщо не надано токен', async () => {
        const response = await request(app)
            .post('/api/favourite/get') // <-- Змінено шлях
            .send({ userId: testUserId });

        expect(response.statusCode).toBe(401);
    });

     it('має повернути помилку, якщо не передано userId в тілі (200 OK, success: false)', async () => {
        const response = await request(app)
            .post('/api/favourite/get') // <-- Змінено шлях
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({}); // Порожнє тіло

        expect(response.statusCode).toBe(200); // Помилка findById -> catch
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Помилка");
     });
});
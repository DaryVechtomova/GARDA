const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Імпорт Express app
const Order = require('../../../models/orderModel');
const Product = require('../../../models/productModel');
const User = require('../../../models/userModel');

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken; // Токен адміна і комірника
let adminUserId, nonAdminUserId;
let productId1, productId2, productId3;
let orderIdNew, orderIdProcessing, orderIdDelivered; // Різні замовлення для тестів
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_orders_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_orders_sys';

// Функції-хелпери
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Orders System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_orders_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Orders System).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Orders System)');
});

beforeEach(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Створення адміна
    const adminPassword = await hashPassword('SysOrderAdminPass');
    const admin = await User.create({
        firstName: 'SysOrderAdmin', secondName: 'Mgr', middleName: 'O',
        email: 'sysorderadmin@test.com', phoneNumber: '7070707070',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1980-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення комірника (для перевірки прав доступу NFR03)
    const nonAdminPassword = await hashPassword('SysOrderNonAdminPass');
    const nonAdmin = await User.create({
        firstName: 'SysOrderNonAdmin', secondName: 'Worker', middleName: 'W',
        email: 'sysordernonadmin@test.com', phoneNumber: '7171717171',
        password: nonAdminPassword, role: 'комірник', isActive: true,
        birthDate: new Date('1991-02-02')
    });
    nonAdminUserId = nonAdmin._id;
    nonAdminToken = generateToken(nonAdminUserId, 'комірник'); // Токен Комірника

    // Створення товарів
    const p1 = await Product.create({ name: 'OrderProd 1', description: 'd1', price: 100, category: 'c1', images: ['i1.jpg'], colors: 'red', sizes: [{ size: 'S', quantity: 10 }, { size: 'M', quantity: 5 }] });
    const p2 = await Product.create({ name: 'OrderProd 2', description: 'd2', price: 50, category: 'c2', images: ['i2.jpg'], colors: 'blue', sizes: [{ size: 'L', quantity: 8 }] });
    const p3 = await Product.create({ name: 'OrderProd 3', description: 'd3', price: 200, category: 'c3', images: ['i3.jpg'], colors: 'green', sizes: [{ size: 'S', quantity: 12 }] });
    productId1 = p1._id;
    productId2 = p2._id;
    productId3 = p3._id;

    // Створення замовлень з різними статусами
    const orderNew = await Order.create({
        userId: new mongoose.Types.ObjectId(), orderNumber: 'SYS001', status: 'Нове замовлення',
        items: [{ productId: productId1, name: 'OrderProd 1', price: 100, size: 'S', image: 'i1.jpg', quantity: 1 }, { productId: productId2, name: 'OrderProd 2', price: 50, size: 'L', image: 'i2.jpg', quantity: 2 }],
        amount: 100, deliveryMethod: 'Самовивіз', deliveryDetails: { firstName: 'FN1', secondName: 'LN1', middleName: 'M1', email: 'e1@t.c', phone: '+380111111111', city: 'Київ' }
    });
    orderIdNew = orderNew._id;

    const orderProcessing = await Order.create({
        userId: new mongoose.Types.ObjectId(), orderNumber: 'SYS002', status: 'В обробці',
        items: [{ productId: productId2, name: 'OrderProd 2', price: 50, size: 'L', image: 'i2.jpg', quantity: 2 }],
        amount: 100, deliveryMethod: 'Нова Пошта', deliveryDetails: { firstName: 'FN2', secondName: 'LN2', middleName: 'M2', email: 'e2@t.c', phone: '+380222222222', region: 'R2', city: 'C2', departmentNumber: '2' }
    });
    orderIdProcessing = orderProcessing._id;

    const orderDelivered = await Order.create({
        userId: new mongoose.Types.ObjectId(), orderNumber: 'SYS003', status: 'Доставлено',
        items: [{ productId: productId1, name: 'OrderProd 1', price: 100, size: 'M', image: 'i1.jpg', quantity: 1 }],
        amount: 100, deliveryMethod: 'Укрпошта', deliveryDetails: { firstName: 'FN3', secondName: 'LN3', middleName: 'M3', email: 'e3@t.c', phone: '+380333333333', region: 'R3', city: 'C3', postalCode: '12345', street: 'S3', houseNumber: '3' }
    });
    orderIdDelivered = orderDelivered._id;
});

// =========================================
// === Системні Тести для Order Controller (Admin) ===
// =========================================

describe('Системне тестування: Адміністратор - Управління замовленнями', () => {

    // --- Сценарій: Перегляд та зміна статусу замовлень (FR015, FR016) ---
    describe('Сценарій: Перегляд та зміна статусу замовлень', () => {
        test('Крок 1 (FR015, NFR01): Отримання списку всіх замовлень (з перевіркою часу)', async () => {
            const MAX_RESPONSE_TIME_MS = 1500; // Встановлюємо ліміт (напр., 1.5 секунди)

            const startTime = performance.now(); // Засікаємо час перед запитом

            const response = await request(app)
                .get('/api/order/list')
                .set('Authorization', `Bearer ${adminToken}`);

            const endTime = performance.now(); // Засікаємо час після відповіді
            const responseTime = endTime - startTime; // Розраховуємо час відповіді

            console.log(`[NFR01 Check] GET /api/order/list response time: ${responseTime.toFixed(2)} ms`); // Логуємо час

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(3);

            // Перевірка часу відповіді
            expect(responseTime).toBeLessThanOrEqual(MAX_RESPONSE_TIME_MS);

        }, 10000);

        test('Крок 2 (FR016): Зміна статусу "Нове замовлення" -> "В обробці"', async () => {
            const newStatus = 'В обробці';
            const response = await request(app)
                .put(`/api/order/update-status/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: newStatus });

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe(newStatus);

            // Перевірка історії в БД
            const updatedOrder = await Order.findById(orderIdNew);
            expect(updatedOrder.status).toBe(newStatus);
            expect(updatedOrder.editHistory.length).toBe(1); // Перша зміна
            expect(updatedOrder.editHistory[0].oldStatus).toBe('Нове замовлення');
            expect(updatedOrder.editHistory[0].newStatus).toBe(newStatus);
        });

        test('Крок 3 (FR016): Зміна статусу "В обробці" -> "Доставлено"', async () => {
            const newStatus = 'Доставлено';
            const response = await request(app)
                .put(`/api/order/update-status/${orderIdProcessing}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: newStatus });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe(newStatus);

            const updatedOrder = await Order.findById(orderIdProcessing);
            expect(updatedOrder.status).toBe(newStatus);
            expect(updatedOrder.editHistory.length).toBe(1);
            expect(updatedOrder.editHistory[0].oldStatus).toBe('В обробці');
            expect(updatedOrder.editHistory[0].newStatus).toBe(newStatus);
        });

        test('Крок 4 (FR016 - Негативний): Спроба оновити статус неіснуючого замовлення', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .put(`/api/order/update-status/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'В обробці' });
            expect(response.statusCode).toBe(404); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Замовлення не знайдено");
        });

        test('Крок 5 (NFR03): Комірник МОЖЕ оновлювати статус', async () => {
            const newStatus = 'Передано в службу доставки';
            const response = await request(app)
                .put(`/api/order/update-status/${orderIdProcessing}`)
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ status: newStatus });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const updatedOrder = await Order.findById(orderIdProcessing);
            expect(updatedOrder.status).toBe(newStatus);
        });
    });

    // --- Сценарій: Скасування замовлення (FR017) ---
    describe('Сценарій: Скасування замовлення', () => {
        const cancelReason = "Неправильно вказано адресу";

        test('Крок 1 (FR017): Успішне скасування "Нового замовлення"', async () => {
            const response = await request(app)
                .put(`/api/order/cancel/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: cancelReason });

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Замовлення успішно скасовано");
            expect(response.body.data.status).toBe("Скасовано");
            expect(response.body.data.cancellationReason).toBe(cancelReason);

            const cancelledOrder = await Order.findById(orderIdNew);
            expect(cancelledOrder.status).toBe("Скасовано");
            expect(cancelledOrder.cancellationReason).toBe(cancelReason);
            // Перевіряємо історію
            expect(cancelledOrder.editHistory.some(h => h.type === 'status_change' && h.newStatus === 'Скасовано')).toBe(true);
        });

        test('Крок 2 (FR017): Успішне скасування замовлення "В обробці" (з поверненням товару)', async () => {
            const productBefore = await Product.findById(productId2);
            const qtyBefore = productBefore.sizes.find(s => s.size === 'L').quantity; // 8

            const response = await request(app)
                .put(`/api/order/cancel/${orderIdProcessing}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: cancelReason });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe("Скасовано");

            const cancelledOrder = await Order.findById(orderIdProcessing);
            expect(cancelledOrder.status).toBe("Скасовано");

            // Перевірка повернення товару
            const productAfter = await Product.findById(productId2);
            expect(productAfter.sizes.find(s => s.size === 'L').quantity).toBe(qtyBefore + 2); // 8 + 2 = 10
        });

        test('Крок 3 (FR017 - Негативний): Спроба скасувати "Доставлене" замовлення', async () => {
            const response = await request(app)
                .put(`/api/order/cancel/${orderIdDelivered}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: cancelReason });
            expect(response.statusCode).toBe(400); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Замовлення можна скасувати тільки");
        });

        test('Крок 4 (FR017 - Негативний): Спроба скасувати неіснуюче замовлення', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .put(`/api/order/cancel/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: cancelReason });
            expect(response.statusCode).toBe(404); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Замовлення не знайдено");
        });

        test('Крок 5 (NFR03): Комірник МОЖЕ скасовувати замовлення', async () => {
            const response = await request(app)
                .put(`/api/order/cancel/${orderIdNew}`)
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ reason: 'Скасовано комірником' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // --- Сценарій: Редагування складу замовлення (FR018, FR019) ---
    describe('Сценарій: Редагування складу замовлення', () => {
        let editData;
        beforeEach(() => {
            editData = {
                editReason: 'Зміна складу за запитом',
                // Оновлюємо: Кількість p1=3, p2 видалено, p3 додано
                items: [
                    { productId: productId1, name: 'OrderProd 1', price: 100, size: 'S', image: 'i1.jpg', quantity: 3 },
                    { productId: productId2, name: 'OrderProd 2', price: 50, size: 'L', image: 'i2.jpg', quantity: 2, removed: true }, // Позначено
                    { productId: productId3, name: 'OrderProd 3', price: 200, size: 'S', image: 'i3.jpg', quantity: 1 }, // Додано
                ],
                amount: (3 * 100) + (1 * 200), // 300 + 200 = 500
            };
        });

        test('Крок 1 (FR018, FR019): Успішне редагування складу та суми', async () => {
            const response = await request(app)
                .post(`/api/order/edit-order/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(editData);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Замовлення успішно оновлено");
            expect(response.body.data.amount).toBe(editData.amount);
            // Перевірка, що повернуто тільки НЕ видалені товари
            expect(response.body.data.items).toHaveLength(3);
            expect(response.body.data.items.find(i => String(i.productId) === String(productId1)).quantity).toBe(3);
            expect(response.body.data.items.find(i => String(i.productId) === String(productId3))).toBeDefined();

            // Перевірка історії в БД (FR019)
            const updatedOrder = await Order.findById(orderIdNew);
            expect(updatedOrder.editHistory).toHaveLength(1);
            const history = updatedOrder.editHistory[0];
            expect(history.type).toBe('order_edit');
            expect(history.reason).toBe(editData.editReason);
            expect(history.changes.amountChanged).toBe(true); // Сума змінилась
            expect(history.changes.items).toBeInstanceOf(Array);

            // Очікуємо 3 зміни: quantity_changed, removed, added
            expect(history.changes.items.length).toBe(3);

            // Перевіряємо наявність кожної зміни
            const quantityChanged = history.changes.items.find(c => c.action === 'quantity_changed');
            const removed = history.changes.items.find(c => c.action === 'removed');
            const added = history.changes.items.find(c => c.action === 'added');

            expect(quantityChanged).toBeDefined();
            expect(removed).toBeDefined();
            expect(added).toBeDefined();

            // Додаткові перевірки для кожної зміни
            if (quantityChanged) {
                expect(quantityChanged.oldQuantity).toBe(1); // Початкова кількість
                expect(quantityChanged.newQuantity).toBe(3); // Нова кількість
            }
            if (removed) {
                expect(removed.productId.toString()).toBe(productId2.toString());
            }
            if (added) {
                expect(added.productId.toString()).toBe(productId3.toString());
            }
        });

        test('Крок 2 (FR018 - Негативний): Редагування неіснуючого замовлення', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .post(`/api/order/edit-order/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(editData);
            expect(response.statusCode).toBe(404); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Замовлення не знайдено");
        });

        test('Крок 3 (NFR04): Редагування без причини', async () => {
            const invalidData = { ...editData };
            delete invalidData.editReason;
            const response = await request(app)
                .post(`/api/order/edit-order/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, оберіть причину редагування");
        });

        test('Крок 4 (NFR03): Комірник МОЖЕ редагувати замовлення', async () => {
            const response = await request(app)
                .post(`/api/order/edit-order/${orderIdNew}`)
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен Комірника
                .send(editData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // --- Сценарій: Перевірка обробки помилок сервера (NFR07) ---
    // (Ці тести складніше реалізувати в інтеграційному середовищі без моків,
    // але можна перевірити реакцію на невалідні ID)
    describe('Сценарій: Обробка помилок сервера (NFR07)', () => {
        test('Крок 1: Невалідний ID для update-status', async () => {
            const invalidId = 'невалідний-id';
            const response = await request(app)
                .put(`/api/order/update-status/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'В обробці' });
            expect(response.statusCode).toBe(500); // Mongoose кине помилку CastError
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка при оновленні статусу");
            expect(response.body.error).toBeDefined(); // Має повернути помилку
            expect(response.body.error).toContain('Cast to ObjectId failed'); // NFR07 - можна приховати це в контролері
        });
        test('Крок 2: Невалідний ID для edit-order', async () => {
            const invalidId = 'невалідний-id';
            const response = await request(app)
                .post(`/api/order/edit-order/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ editReason: 'Тест', items: [], amount: 0 });
            expect(response.statusCode).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка при оновленні замовлення");
            expect(response.body.error).toContain('Cast to ObjectId failed');
        });
    });

});
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { app } from '../../../server.js';
import Order from '../../../models/orderModel.js';
import Product from '../../../models/productModel.js';
import User from '../../../models/userModel.js';

let adminToken;
let adminUserId;
let orderIdToEdit;
let productId1;
let productId2;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_orders';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_orders';

const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Orders)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_orders') {
        console.warn('Warning: Using fallback JWT secret for tests (Orders).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Orders)');
});

beforeEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Створення тестового адміністратора
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminPass123', salt);
    const admin = await User.create({
        firstName: 'OrderAdmin',
        secondName: 'Test',
        middleName: 'O.',
        email: 'order.admin@test.com',
        phoneNumber: '111222333',
        password: hashedPassword,
        role: 'адміністратор',
        isActive: true,
        birthDate: new Date('1990-01-01'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення тестових товарів
    const product1 = await Product.create({ name: 'Тест Товар 1', description: 'd', price: 100, category: 'c', images: ['i1.jpg'], colors: 'red', sizes: [{ size: 'M', quantity: 10 }] });
    const product2 = await Product.create({ name: 'Тест Товар 2', description: 'd', price: 50, category: 'c', images: ['i2.jpg'], colors: 'blue', sizes: [{ size: 'L', quantity: 5 }] });
    productId1 = product1._id;
    productId2 = product2._id;


    // Створення тестового замовлення
    const testOrder = await Order.create({
        userId: new mongoose.Types.ObjectId(),
        items: [
            { productId: productId1, name: 'Тест Товар 1', price: 100, discount: 0, size: 'M', image: 'i1.jpg', quantity: 1 },
            { productId: productId2, name: 'Тест Товар 2', price: 50, discount: 10, size: 'L', image: 'i2.jpg', quantity: 2 },
        ],
        amount: 100 + (50 * 0.9 * 2),
        status: 'Нове замовлення',
        deliveryMethod: 'Нова Пошта',
        deliveryDetails: {
            firstName: 'Тест', secondName: 'Клієнт', middleName: 'М', email: 'client@test.com', phone: '+380501112233', region: 'Обл', city: 'Місто', departmentNumber: '1'
        },
        orderNumber: '123456789012',
        editHistory: []
    });
    orderIdToEdit = testOrder._id;
});


// Тести для GET /api/order/list
describe('GET /api/order/list', () => {
    it('TCO01 - має успішно повернути список всіх замовлень (200 OK)', async () => {
        const response = await request(app)
            .get('/api/order/list')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(response.body.data[0].orderNumber).toBe('123456789012');
    });

    it('TCO02 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app).get('/api/order/list');
        expect(response.statusCode).toBe(401);
    });

    it('TCO03 - має повернути 403, якщо токен не адміна/комірника (тестуємо з невалідним)', async () => {
        const clientPassword = await bcrypt.hash('clientPass', await bcrypt.genSalt(10));
        const client = await User.create({
            firstName: 'Клієнт', secondName: 'Тест', middleName: 'К',
            email: 'client.order@test.com', phoneNumber: '777666555',
            password: clientPassword, role: 'користувач'
        });
        const clientToken = generateToken(client._id, 'користувач');

        const response = await request(app)
            .get('/api/order/list')
            .set('Authorization', `Bearer ${clientToken}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Доступ заборонено");
    });
    expect.extend({
        toBeOneOf(received, expectedStatusCodes) {
            const pass = expectedStatusCodes.includes(received);
            return {
                message: () => `expected ${received} to be one of [${expectedStatusCodes.join(', ')}]`,
                pass,
            };
        },
    });
});


// Тести для PUT /api/order/update-status/:orderId
describe('PUT /api/order/update-status/:orderId', () => {
    const newStatus = 'В обробці';

    it('TCO04 - має успішно оновити статус замовлення (200 OK)', async () => {
        const response = await request(app)
            .put(`/api/order/update-status/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: newStatus });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Статус замовлення оновлено");
        expect(response.body.data.status).toBe(newStatus);

        const updatedOrder = await Order.findById(orderIdToEdit);
        expect(updatedOrder.status).toBe(newStatus);
        expect(updatedOrder.editHistory).toBeInstanceOf(Array);
        expect(updatedOrder.editHistory.length).toBeGreaterThan(0);
        const lastHistory = updatedOrder.editHistory[updatedOrder.editHistory.length - 1];
        expect(lastHistory.type).toBe('status_change');
        expect(lastHistory.oldStatus).toBe('Нове замовлення');
        expect(lastHistory.newStatus).toBe(newStatus);
        expect(String(lastHistory.editedBy.userId)).toBe(String(adminUserId));
    });

    it('TCO05 - має повернути 404, якщо ID замовлення не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .put(`/api/order/update-status/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: newStatus });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення не знайдено");
    });

    it('TCO02 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app)
            .put(`/api/order/update-status/${orderIdToEdit}`)
            .send({ status: newStatus });
        expect(response.statusCode).toBe(401);
    });
});

// Тести для PUT /api/order/cancel/:orderId
describe('PUT /api/order/cancel/:orderId', () => {
    const reason = 'Тестова причина скасування';

    it('TCO06 - має успішно скасувати "Нове замовлення" (200 OK)', async () => {
        const response = await request(app)
            .put(`/api/order/cancel/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: reason });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Замовлення успішно скасовано");
        expect(response.body.data.status).toBe("Скасовано");
        expect(response.body.data.cancellationReason).toBe(reason);

        const cancelledOrder = await Order.findById(orderIdToEdit);
        expect(cancelledOrder.status).toBe("Скасовано");
        expect(cancelledOrder.cancellationReason).toBe(reason);
        expect(cancelledOrder.editHistory.some(h => h.type === 'status_change' && h.newStatus === 'Скасовано')).toBe(true);
    });

    it('TCO07 - має успішно скасувати замовлення "В обробці" та повернути товар (200 OK)', async () => {
        await Order.findByIdAndUpdate(orderIdToEdit, { status: 'В обробці' });
        const product1Before = await Product.findById(productId1);
        const product2Before = await Product.findById(productId2);
        const qty1Before = product1Before.sizes.find(s => s.size === 'M').quantity;
        const qty2Before = product2Before.sizes.find(s => s.size === 'L').quantity;

        const response = await request(app)
            .put(`/api/order/cancel/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: reason });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe("Скасовано");

        const cancelledOrder = await Order.findById(orderIdToEdit);
        expect(cancelledOrder.status).toBe("Скасовано");

        const product1After = await Product.findById(productId1);
        const product2After = await Product.findById(productId2);
        expect(product1After.sizes.find(s => s.size === 'M').quantity).toBe(qty1Before + 1);
        expect(product2After.sizes.find(s => s.size === 'L').quantity).toBe(qty2Before + 2);
    });

    it('TCO05 - має повернути 404, якщо ID замовлення не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .put(`/api/order/cancel/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: reason });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення не знайдено");
    });

    it('TCO08 - має повернути 400, якщо статус замовлення не дозволяє скасування', async () => {
        await Order.findByIdAndUpdate(orderIdToEdit, { status: 'Доставлено' });

        const response = await request(app)
            .put(`/api/order/cancel/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: reason });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Замовлення можна скасувати тільки");
    });
});

// Тести для POST /api/order/edit-order/:id
describe('POST /api/order/edit-order/:id', () => {
    let editData;

    beforeEach(() => {
        editData = {
            editReason: 'Коригування клієнтом',
            items: [
                { productId: productId1, name: 'Тест Товар 1', size: 'M', quantity: 3, price: 100, image: 'i1.jpg' },
                { productId: productId2, name: 'Тест Товар 2', size: 'L', quantity: 2, price: 50, image: 'i2.jpg', removed: true },
                { productId: new mongoose.Types.ObjectId(), name: 'Новий Тест Товар 3', size: 'S', quantity: 1, price: 200, image: 'i3.jpg' },
            ],
            amount: (3 * 100) + (1 * 200),
        };
    });

    it('TCO09 - має успішно оновити замовлення та записати зміни (200 OK)', async () => {
        const response = await request(app)
            .post(`/api/order/edit-order/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(editData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Замовлення успішно оновлено");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.amount).toBe(editData.amount);

        const nonRemovedItems = response.body.data.items.filter(item => !item.removed);
        expect(nonRemovedItems).toHaveLength(2);
        expect(nonRemovedItems[0].quantity).toBe(3);
        expect(nonRemovedItems[1].name).toBe('Новий Тест Товар 3');

        const updatedOrder = await Order.findById(orderIdToEdit);
        expect(updatedOrder.amount).toBe(editData.amount);

        const dbNonRemovedItems = updatedOrder.items.filter(item => !item.removed);
        expect(dbNonRemovedItems).toHaveLength(2);

        const product1Item = dbNonRemovedItems.find(i => String(i.productId) === String(productId1));
        expect(product1Item).toBeDefined();
        expect(product1Item.quantity).toBe(3);

        expect(dbNonRemovedItems.some(i => i.name === 'Новий Тест Товар 3')).toBe(true);

        expect(updatedOrder.editHistory).toHaveLength(1);
        const history = updatedOrder.editHistory[0];
        expect(history.type).toBe('order_edit');
        expect(history.reason).toBe(editData.editReason);
        expect(history.changes.amountChanged).toBe(true);
        expect(history.changes.oldAmount).toBe(190);
        expect(history.changes.newAmount).toBe(editData.amount);
        expect(history.changes.items).toBeInstanceOf(Array);
        expect(history.changes.items.some(c => c.action === 'quantity_changed' && String(c.productId) === String(productId1))).toBe(true);
        expect(history.changes.items.some(c => c.action === 'removed' && String(c.productId) === String(productId2))).toBe(true);
        expect(history.changes.items.some(c => c.action === 'added' && c.name === 'Новий Тест Товар 3')).toBe(true);
    });

    it('TCO10 - має повернути 404, якщо ID замовлення не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post(`/api/order/edit-order/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(editData);

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення не знайдено");
    });

    it('TCO11 - має повернути 400, якщо не вказано причину редагування', async () => {
        const invalidData = { ...editData };
        delete invalidData.editReason;
        const response = await request(app)
            .post(`/api/order/edit-order/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, оберіть причину редагування");
    });

    it('TCO02 - має повернути 401, якщо немає токена', async () => {
        const response = await request(app)
            .post(`/api/order/edit-order/${orderIdToEdit}`)
            .send(editData);
        expect(response.statusCode).toBe(401);
    });
});

// Тести для GET /api/order/edit-order/:id
describe('GET /api/order/edit-order/:id', () => {
    it('має успішно повернути дані замовлення для редагування (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/order/edit-order/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(orderIdToEdit));
        expect(response.body.data.orderNumber).toBe('123456789012');
    });

    it('має повернути 404 (як success:false), якщо ID замовлення не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/order/edit-order/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення не знайдено");
    });
});

// Тести для GET /api/order/details/:orderId
describe('GET /api/order/details/:orderId', () => {
    it('має успішно повернути деталі замовлення (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/order/details/${orderIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(orderIdToEdit));
    });

    it('має повернути 404 (як success:false), якщо ID замовлення не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/order/details/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення не знайдено");
    });
});
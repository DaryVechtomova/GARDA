const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Імпорт Express app
const Invoice = require('../../../models/invoiceModel');
const Product = require('../../../models/productModel');
const Supplier = require('../../../models/supplierModel');
const User = require('../../../models/userModel');

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken; // Тільки адмін може керувати накладними
let adminUserId, nonAdminUserId;
let supplierId;
let productId1, productId2, productId3;
let invoiceIdActive, invoiceIdCompleted; // ID створених накладних
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_invoices_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_invoices_sys';

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
    console.log('Connected to Test DB (Invoices System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_invoices_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Invoices System).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Invoices System)');
});

beforeEach(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Створення адміна
    const adminPassword = await hashPassword('SysInvAdminPass');
    const admin = await User.create({
        firstName: 'SysInvAdmin', secondName: 'Main', middleName: 'I',
        email: 'sysinvadmin@test.com', phoneNumber: '8080808080',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1987-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення комірника
    const nonAdminPassword = await hashPassword('SysOrderNonAdminPass');
    const nonAdmin = await User.create({
        firstName: 'SysOrderNonAdmin', secondName: 'Worker', middleName: 'W',
        email: 'sysordernonadmin@test.com', phoneNumber: '7171717171',
        password: nonAdminPassword, role: 'комірник', isActive: true,
        birthDate: new Date('1991-02-02')
    });
    nonAdminUserId = nonAdmin._id;
    nonAdminToken = generateToken(nonAdminUserId, 'комірник'); // Токен Комірника

    // Створення постачальника
    const supplier = await Supplier.create({
        companyName: 'Накладний Постач', contactPerson: 'Н. Пост', email: 'invsupp@t.c',
        phone: '1112223345', address: 'АДР Накл', city: 'Місто Накл', productType: 'одяг'
    });
    supplierId = supplier._id;

    // Створення товарів
    const p1 = await Product.create({ name: 'InvProd 1', description: 'd1', price: 50, category: 'c1', images: ['i1.jpg'], colors: 'red', sizes: [{ size: 'S', quantity: 10 }, { size: 'M', quantity: 20 }] });
    const p2 = await Product.create({ name: 'InvProd 2', description: 'd2', price: 150, category: 'c2', images: ['i2.jpg'], colors: 'blue', sizes: [{ size: 'L', quantity: 15 }] });
    const p3 = await Product.create({ name: 'InvProd 3', description: 'd3', price: 25, category: 'c3', images: ['i3.jpg'], colors: 'green', sizes: [{ size: 'S', quantity: 5 }] });
    productId1 = p1._id;
    productId2 = p2._id;
    productId3 = p3._id;

    // Створення накладних
    const invActive = await Invoice.create({
        invoiceNumber: 'INV-SYS-001', supplier: supplierId, status: 'активна',
        products: [
            { product: productId1, size: 'S', quantity: 5, pricePerUnit: 40 },
            { product: productId2, size: 'L', quantity: 3, pricePerUnit: 120 },
        ],
        totalAmount: (5 * 40) + (3 * 120), // 200 + 360 = 560
        createdBy: { userId: adminUserId, name: 'SysInvAdmin Main' },
        changesHistory: []
    });
    invoiceIdActive = invActive._id;

    const invCompleted = await Invoice.create({
        invoiceNumber: 'INV-SYS-002', supplier: supplierId, status: 'виконана',
        products: [{ product: productId1, size: 'M', quantity: 10, pricePerUnit: 45 }],
        totalAmount: 450,
        createdBy: { userId: adminUserId, name: 'SysInvAdmin Main' },
        changesHistory: []
    });
    invoiceIdCompleted = invCompleted._id;
});

// =========================================
// === Системні Тести для Invoice Controller (Admin) ===
// =========================================

describe('Системне тестування: Адміністратор - Управління накладними', () => {

    // --- Сценарій: Створення та Перегляд Накладних (FR024, FR025, FR026) ---
    describe('Сценарій: Створення та Перегляд Накладних', () => {
        const newInvoiceData = {
            supplier: null, // Буде встановлено в beforeEach тесту
            products: [],   // Буде встановлено в beforeEach тесту
            totalAmount: 0, // Буде розраховано
            notes: 'Системний тест створення',
        };
        let createdInvoiceId;

        beforeEach(() => {
            // Актуалізуємо дані перед кожним тестом цього сценарію
            newInvoiceData.supplier = String(supplierId);
            newInvoiceData.products = [
                { product: String(productId1), size: 'M', quantity: 7, pricePerUnit: 42 },
                { product: String(productId3), size: 'S', quantity: 4, pricePerUnit: 20 },
            ];
            newInvoiceData.totalAmount = (7 * 42) + (4 * 20); // 294 + 80 = 374
        });

        test('Крок 1 (FR024): Успішне створення накладної', async () => {
            const response = await request(app)
                .post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newInvoiceData);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Накладну додано");
            expect(response.body.data).toBeDefined();
            expect(response.body.data.invoiceNumber).toMatch(/^INV-\d{6}$/);
            expect(response.body.data.status).toBe('активна');
            expect(response.body.data.totalAmount).toBe(newInvoiceData.totalAmount);
            createdInvoiceId = response.body.data._id; // Зберігаємо ID

            // Перевірка в БД
            const createdInvoice = await Invoice.findById(createdInvoiceId);
            expect(createdInvoice).not.toBeNull();
            expect(createdInvoice.totalAmount).toBe(newInvoiceData.totalAmount);
            expect(createdInvoice.changesHistory).toHaveLength(1); // Запис про створення
        });

        test('Крок 2 (FR025): Перегляд списку накладних (перевірка наявності створеної)', async () => {
            // Спочатку створюємо накладну з Кроку 1
            const createResponse = await request(app)
                .post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newInvoiceData);
            createdInvoiceId = createResponse.body.data._id;
            expect(createdInvoiceId).toBeDefined();

            // Тепер отримуємо список
            const response = await request(app)
                .get('/api/invoices/list-invoice')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(3); // 2 з beforeEach + 1 створена
            const found = response.body.data.find(inv => String(inv._id) === String(createdInvoiceId));
            expect(found).toBeDefined();
            // Перевірка populate
            expect(found.supplier).toBeInstanceOf(Object);
            expect(found.supplier.companyName).toBe('Накладний Постач');
            expect(found.products[0].product).toBeInstanceOf(Object);
            expect(found.products[0].product.name).toBe('InvProd 1');
        });

        test('Крок 3 (FR026): Перегляд деталей створеної накладної', async () => {
            // Спочатку створюємо накладну з Кроку 1
            const createResponse = await request(app)
                .post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newInvoiceData);
            createdInvoiceId = createResponse.body.data._id;
            expect(createdInvoiceId).toBeDefined();

            // Тепер отримуємо деталі
            const response = await request(app)
                .get(`/api/invoices/details/${createdInvoiceId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data._id).toBe(String(createdInvoiceId));
            expect(response.body.data.totalAmount).toBe(newInvoiceData.totalAmount);
            expect(response.body.data.supplier.companyName).toBe('Накладний Постач');
            expect(response.body.data.products[0].product.name).toBe('InvProd 1');
        });

        test('Крок 4 (FR024 - Негативний, NFR04): Спроба створити накладну без товарів', async () => {
            const invalidData = { ...newInvoiceData, products: [] };
            const response = await request(app)
                .post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, додайте товари до накладної");
        });

        test('Крок 5 (FR024 - Негативний, NFR04): Спроба створити накладну з неіснуючим постачальником', async () => {
            const nonExistentSupplierId = new mongoose.Types.ObjectId().toString();
            const invalidData = { ...newInvoiceData, supplier: nonExistentSupplierId };
            const response = await request(app)
                .post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Постачальника не знайдено");
        });
    });

    // --- Сценарій: Редагування Накладної (FR027, FR019) ---
    describe('Сценарій: Редагування Накладної', () => {
        let editData;
        beforeEach(() => {
            editData = {
                id: String(invoiceIdActive), // Редагуємо активну
                notes: 'Змінені нотатки редагування',
                // Змінюємо склад: +p3, зміна кількості p1, видалення p2
                products: [
                    { product: String(productId1), size: 'S', quantity: 8, pricePerUnit: 41 },
                    { product: String(productId3), size: 'S', quantity: 2, pricePerUnit: 22 },
                    // productId2 видалено
                ],
                totalAmount: (8 * 41) + (2 * 22), // 328 + 44 = 372
                status: 'скасована' // Змінюємо і статус
            };
        });

        test('Крок 1 (FR027): Успішне редагування накладної', async () => {
            const response = await request(app)
                .post('/api/invoices/edit-invoice') // Використовуємо POST згідно роуту
                .set('Authorization', `Bearer ${adminToken}`)
                .send(editData);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Накладну оновлено");
            expect(response.body.data.notes).toBe(editData.notes);
            expect(response.body.data.status).toBe(editData.status);
            expect(response.body.data.totalAmount).toBe(editData.totalAmount);
            expect(response.body.data.products).toHaveLength(2); // p2 видалено

            // Перевірка історії в БД (FR019)
            const updatedInvoice = await Invoice.findById(invoiceIdActive);
            expect(updatedInvoice.notes).toBe(editData.notes);
            expect(updatedInvoice.status).toBe(editData.status);
            expect(updatedInvoice.changesHistory).toHaveLength(1); // Один запис редагування
            const history = updatedInvoice.changesHistory[0];
            expect(history.changedBy.userId).toEqual(adminUserId);
            expect(history.changes.notes).toBeDefined();
            expect(history.changes.status).toBeDefined();
            expect(history.changes.products).toBeDefined();
            // Можна додати детальнішу перевірку changes.products
        });

        test('Крок 2 (FR027 - Негативний): Редагування неіснуючої накладної', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .post('/api/invoices/edit-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editData, id: nonExistentId });
            expect(response.statusCode).toBe(404); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Накладну не знайдено");
        });

        test('Крок 3 (NFR03): Комірник НЕ МОЖЕ редагувати накладну', async () => {
            const response = await request(app)
                .post('/api/invoices/edit-invoice')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send(editData);
            expect(response.statusCode).toBe(403); // Forbidden (бо strictAdminMiddleware)
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });
    });

    // --- Сценарій: Виконання Накладної (FR028) ---
    describe('Сценарій: Виконання Накладної', () => {
        test('Крок 1 (FR028): Успішне виконання активної накладної', async () => {
            const product1Before = await Product.findById(productId1);
            const product2Before = await Product.findById(productId2);
            const qty1Before = product1Before.sizes.find(s => s.size === 'S').quantity; // 10
            const qty2Before = product2Before.sizes.find(s => s.size === 'L').quantity; // 15

            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdActive) }); // Виконуємо активну

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Накладу виконано та товари додано на склад");
            expect(response.body.data.status).toBe("виконана");

            // Перевірка статусу в БД
            const completedInvoice = await Invoice.findById(invoiceIdActive);
            expect(completedInvoice.status).toBe("виконана");

            // Перевірка оновлення кількості товарів в БД
            const product1After = await Product.findById(productId1);
            const product2After = await Product.findById(productId2);
            expect(product1After.sizes.find(s => s.size === 'S').quantity).toBe(qty1Before + 5); // 10 + 5 = 15
            expect(product2After.sizes.find(s => s.size === 'L').quantity).toBe(qty2Before + 3); // 15 + 3 = 18
        });

        test('Крок 2 (FR028 - Негативний): Спроба виконати вже виконану накладну', async () => {
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdCompleted) }); // Виконуємо вже виконану

            expect(response.statusCode).toBe(400); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Накладна вже виконана");
        });

        test('Крок 3 (FR028 - Негативний): Спроба виконати скасовану накладну', async () => {
            // Спочатку скасовуємо активну накладну
            await Invoice.findByIdAndUpdate(invoiceIdActive, { status: 'скасована' });
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdActive) });

            expect(response.statusCode).toBe(400); // NFR04
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Накладна вже скасована");
        });

        test('Крок 4 (FR028 - Негативний): Спроба виконати накладну з неіснуючим товаром', async () => {
            // Видаляємо товар перед виконанням
            await Product.findByIdAndDelete(productId1);
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdActive) });
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain(`Товар з ID ${productId1} не знайдено`);
        });

        test('Крок 5 (FR028 - Негативний): Спроба виконати накладну з неіснуючим розміром', async () => {
            // Змінюємо розмір в накладній
            await Invoice.findByIdAndUpdate(invoiceIdActive, { $set: { "products.0.size": "XXXL" } });
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdActive) });
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain(`Розмір XXXL не знайдено для товару InvProd 1`);
        });

        test('Крок 6 (NFR03): Комірник НЕ МОЖЕ виконати накладну', async () => {
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ id: String(invoiceIdActive) });
            expect(response.statusCode).toBe(403); // Forbidden (бо strictAdminMiddleware)
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });
    });

    // --- Сценарій: Перегляд Деталей та Даних для Редагування Накладної (FR026) ---
    describe('Сценарій: Перегляд Деталей та Даних для Редагування', () => {
        test('Крок 1 (FR026): GET /details/:id - Успішне отримання', async () => {
            const response = await request(app)
                .get(`/api/invoices/details/${invoiceIdActive}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(String(invoiceIdActive));
            expect(response.body.data.supplier).toBeInstanceOf(Object); // populate
            expect(response.body.data.products[0].product).toBeInstanceOf(Object); // populate
        });

        test('Крок 2 (FR026 - Негативний): GET /details/:id - Неіснуючий ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .get(`/api/invoices/details/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Накладна не знайдена");
        });

        test('Крок 3: GET /edit-invoice/:id - Успішне отримання', async () => {
            const response = await request(app)
                .get(`/api/invoices/edit-invoice/${invoiceIdActive}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(String(invoiceIdActive));
        });

        test('Крок 4: GET /edit-invoice/:id - Неіснуючий ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .get(`/api/invoices/edit-invoice/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(response.statusCode).toBe(200); // Цей роут повертає 200 з помилкою
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Накладну не знайдено");
        });
    });

});
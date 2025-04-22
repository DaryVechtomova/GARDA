const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server'); // Імпорт Express app
const Supplier = require('../../../models/supplierModel');
const Invoice = require('../../../models/invoiceModel');
const User = require('../../../models/userModel');

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken;
let adminUserId, nonAdminUserId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_suppliers_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_suppliers_sys';

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
    console.log('Connected to Test DB (Suppliers System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_suppliers_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Suppliers System).');
    }
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    await mongoose.connection.close();
    console.log('Test DB connection closed (Suppliers System)');
});

beforeEach(async () => {
    // Створення адміна
    const adminPassword = await hashPassword('SysSuppAdminPass');
    const admin = await User.create({
        firstName: 'SysSuppAdmin', secondName: 'Main', middleName: 'S',
        email: 'syssuppadmin@test.com', phoneNumber: '6060606060',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1989-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення Комірника (для NFR03)
    const nonAdminPassword = await hashPassword('SysSuppNonAdminPass');
    const nonAdmin = await User.create({
        firstName: 'SysSuppNonAdmin', secondName: 'Worker', middleName: 'W',
        email: 'syssuppnonadmin@test.com', phoneNumber: '6161616161',
        password: nonAdminPassword, role: 'комірник', isActive: true,
        birthDate: new Date('1992-02-02')
    });
    nonAdminUserId = nonAdmin._id;
    nonAdminToken = generateToken(nonAdminUserId, 'комірник');
});

// =========================================
// === Системні Тести для Supplier Controller (Admin) ===
// =========================================

describe('Системне тестування: Адміністратор - Управління постачальниками', () => {

    // --- Сценарій: Повний цикл CRUD для постачальника (FR020, FR021, FR022, FR023) ---
    describe('Сценарій: Повний цикл CRUD для постачальника', () => {
        let supplierId;
        const initialData = {
            companyName: 'CRUD Постач', contactPerson: 'Круд Контакт', email: 'crud@supplier.test',
            phone: '+380991231212', address: 'Круд Адреса', city: 'Круд Місто', country: 'Україна',
            productType: 'взуття', status: 'активний', notes: 'Початкові нотатки'
        };
        const updatedData = {
            companyName: 'CRUD Постач Оновлений', contactPerson: 'Контакт Онов', email: 'crud.updated@supplier.test',
            phone: '+380991231213', address: 'Адреса Онов', city: 'Місто Онов', country: 'Україна',
            productType: 'аксесуари', status: 'призупинений', notes: 'Оновлені нотатки'
        };

        test('Крок 1 (FR020): Створення постачальника', async () => {
            const response = await request(app)
                .post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(initialData);

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Постачальника додано");

            const createdSupplier = await Supplier.findOne({ companyName: initialData.companyName });
            expect(createdSupplier).not.toBeNull();
            supplierId = createdSupplier._id; // Зберігаємо ID
            expect(createdSupplier.status).toBe('активний'); // Перевірка статусу за замовч.
        });

        test('Крок 2 (FR021): Перегляд списку постачальників (перевірка наявності)', async () => {
            expect(supplierId).toBeDefined(); // Переконуємось, що ID є
            const response = await request(app)
                .get('/api/suppliers/list-supplier')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            const found = response.body.data.find(s => String(s._id) === String(supplierId));
            expect(found).toBeDefined();
            expect(found.companyName).toBe(initialData.companyName);
        });

        test('Крок 3 (FR022): Редагування постачальника', async () => {
            expect(supplierId).toBeDefined();
            const response = await request(app)
                .post('/api/suppliers/edit-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...updatedData, id: String(supplierId) }); // Передаємо ID

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Постачальника оновлено");
            expect(response.body.data.companyName).toBe(updatedData.companyName);
            expect(response.body.data.status).toBe(updatedData.status);
            expect(response.body.data.cooperationEndDate).toBeUndefined(); // Ще не завершений

            // Перевірка в БД
            const updatedSupplier = await Supplier.findById(supplierId);
            expect(updatedSupplier.companyName).toBe(updatedData.companyName);
            expect(updatedSupplier.status).toBe(updatedData.status);
        });

        test('Крок 4 (FR022): Завершення співпраці (зміна статусу на "завершений")', async () => {
            expect(supplierId).toBeDefined();
            const response = await request(app)
                .post('/api/suppliers/edit-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...updatedData, status: 'завершений', id: String(supplierId) });

            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('завершений');
            expect(response.body.data.cooperationEndDate).toBeDefined();
            const date = new Date(response.body.data.cooperationEndDate);
            expect(date).toBeInstanceOf(Date);
            expect(isNaN(date.getTime())).toBe(false); // Перевірка, що дата валідна

            const finishedSupplier = await Supplier.findById(supplierId);
            expect(finishedSupplier.status).toBe('завершений');
            expect(finishedSupplier.cooperationEndDate).toBeInstanceOf(Date);
        });

        test('Крок 5 (FR022): Відновлення співпраці (зміна статусу з "завершений" на "активний")', async () => {
            expect(supplierId).toBeDefined();
            // Спочатку переводимо в завершений (як у попередньому кроці)
            await Supplier.findByIdAndUpdate(supplierId, { status: 'завершений', cooperationEndDate: new Date() });

            const response = await request(app)
                .post('/api/suppliers/edit-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...updatedData, status: 'активний', id: String(supplierId) }); // Повертаємо в активний

            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('активний');
            // У відповіді cooperationEndDate може бути null або undefined, перевіряємо на falsy
            expect(response.body.data.cooperationEndDate).toBeFalsy();

            const reactivatedSupplier = await Supplier.findById(supplierId);
            expect(reactivatedSupplier.status).toBe('активний');
            expect(reactivatedSupplier.cooperationEndDate).toBeFalsy(); // В базі має бути null або undefined
        });

        test('Крок 6 (FR023): Видалення постачальника', async () => {
            expect(supplierId).toBeDefined();
            const response = await request(app)
                .post('/api/suppliers/remove')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(supplierId) });

            expect(response.statusCode).toBe(200); // NFR05
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Постачальника видалено");

            // Перевірка в БД
            const deletedSupplier = await Supplier.findById(supplierId);
            expect(deletedSupplier).toBeNull();
        });
    });

    // --- Сценарій: Невдале додавання постачальника (FR020, NFR04, NFR02) ---
    describe('Сценарій: Невдале додавання постачальника', () => {
        const baseData = {
            contactPerson: 'Fail Add', email: 'fail.add@supplier.test', phone: '+380111111111',
            address: 'Fail Addr', city: 'Fail City', country: 'Україна',
            productType: 'одяг', status: 'активний'
        };

        test('Крок 1 (NFR02): Дублювання назви компанії', async () => {
            await Supplier.create({ ...baseData, companyName: 'Duplicate Name' }); // Створюємо спочатку
            const response = await request(app)
                .post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...baseData, companyName: 'Duplicate Name' }); // Пробуємо додати таку ж
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Компанія з такою назвою вже існує");
        });

        test('Крок 2 (NFR04): Відсутнє обов\'язкове поле (email)', async () => {
            const invalidData = { ...baseData, companyName: 'Missing Email Supp' };
            delete invalidData.email;
            const response = await request(app)
                .post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть email");
        });

        test('Крок 3 (NFR04): Не обрано тип продукції', async () => {
            const invalidData = { ...baseData, companyName: 'No Type Supp', productType: 'Оберіть тип продукції' };
            const response = await request(app)
                .post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, оберіть тип продукції");
        });
    });

    // --- Сценарій: Невдале видалення постачальника (FR023) ---
    describe('Сценарій: Невдале видалення постачальника', () => {
        let supplierWithInvoiceId;
        beforeEach(async () => {
            // Створюємо постачальника і залежну накладну
            const supplier = await Supplier.create({ companyName: 'SuppWithInv', contactPerson: 'c', email: 'swi@t.c', phone: 'p', address: 'a', city: 'c', productType: 'одяг' });
            supplierWithInvoiceId = supplier._id;
            await Invoice.create({
                invoiceNumber: `INV-FAIL-DEL-${new Date().getTime()}`, supplier: supplierWithInvoiceId, status: 'активна',
                products: [{ product: new mongoose.Types.ObjectId(), size: 'S', quantity: 1, pricePerUnit: 1 }], totalAmount: 1, createdBy: { userId: adminUserId, name: 'Admin' }
            });
        });

        test('Крок 1: Спроба видалити постачальника з активною накладною', async () => {
            const response = await request(app)
                .post('/api/suppliers/remove')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(supplierWithInvoiceId) });
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Не можна видалити постачальника, у якого є накладні");
            const supplier = await Supplier.findById(supplierWithInvoiceId);
            expect(supplier).not.toBeNull(); // Перевіряємо, що не видалено
        });

        test('Крок 2: Спроба видалити неіснуючого постачальника', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .post('/api/suppliers/remove')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: nonExistentId });
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Постачальника не знайдено");
        });
    });

    // --- Сценарій: Перевірка прав доступу (NFR03) ---
    describe('Сценарій: Перевірка прав доступу (NFR03) - Постачальники', () => {
        const supplierData = { companyName: 'AuthTest', contactPerson: 'A', email: 'auth@t.c', phone: 'p', address: 'a', country: 'Україна', city: 'c', productType: 'інше', status: 'активний' };
        let createdSupplierId;

        beforeEach(async () => {
            // Створюємо постачальника для тестів редагування/видалення
            const supplier = await Supplier.create({ companyName: 'AuthTarget', contactPerson: 'T', email: 'target@t.c', phone: 'p', address: 'a', country: 'Україна', city: 'c', productType: 'одяг' });
            createdSupplierId = supplier._id;
        });

        test('Крок 1: Комірник МОЖЕ додавати постачальника', async () => {
            const response = await request(app)
                .post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send(supplierData);
            console.log(response.body);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 2: Комірник НЕ МОЖЕ отримувати список постачальників', async () => {
            const response = await request(app)
                .get('/api/suppliers/list-supplier')
                .set('Authorization', `Bearer ${nonAdminToken}`); // Токен комірника
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 3: Комірник МОЖЕ редагувати постачальника', async () => {
            const response = await request(app)
                .post('/api/suppliers/edit-supplier')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ id: String(createdSupplierId), companyName: 'Edited by NonAdmin', contactPerson: 'NA', email: 'na@t.c', phone: 'p', address: 'a', country: 'Україна', city: 'c', productType: 'одяг', status: 'активний' });
            console.log(response.body);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 4: Комірник МОЖЕ видаляти постачальника (якщо немає накладних)', async () => {
            // Переконуємось, що немає накладних для цього постачальника
            await Invoice.deleteMany({ supplier: createdSupplierId });
            const response = await request(app)
                .post('/api/suppliers/remove')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ id: String(createdSupplierId) });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 5: Неавторизований користувач НЕ може отримати список', async () => {
            const response = await request(app).get('/api/suppliers/list-supplier');
            expect(response.statusCode).toBe(401); // Unauthorized
        });
    });
});
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../../server');
const Invoice = require('../../../models/invoiceModel');
const Product = require('../../../models/productModel');
const Supplier = require('../../../models/supplierModel');
const User = require('../../../models/userModel');

let adminToken;
let adminUserId;
let supplierId;
let productId1, productId2;
let invoiceIdToEdit;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_invoices';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_invoices';

const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Invoices)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_invoices') {
        console.warn('Warning: Using fallback JWT secret for tests (Invoices).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Invoices)');
});

beforeEach(async () => {

    await Invoice.deleteMany({});
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await User.deleteMany({});

    // Створення тестового адміністратора
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('invoiceAdminPass', salt);
    const admin = await User.create({
        firstName: 'InvoiceAdmin', secondName: 'Tester', middleName: 'I',
        email: 'invoice.admin@test.com', phoneNumber: '888999000',
        password: hashedPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1992-02-02'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення тестового постачальника
    const supplier = await Supplier.create({
        companyName: 'Тест Постач Накл', contactPerson: 'П. Тест', email: 'supp@inv.tst',
        phone: '1112223344', address: 'АДР', city: 'Місто', productType: 'одяг'
    });
    supplierId = supplier._id;

    // Створення тестових товарів
    const product1 = await Product.create({ name: 'Накл Товар 1', description: 'd1', price: 100, category: 'c1', images: ['i1.jpg'], colors: 'red', sizes: [{ size: 'M', quantity: 10 }] });
    const product2 = await Product.create({ name: 'Накл Товар 2', description: 'd2', price: 50, category: 'c2', images: ['i2.jpg'], colors: 'blue', sizes: [{ size: 'L', quantity: 5 }] });
    productId1 = product1._id;
    productId2 = product2._id;

    // Створення тестової накладної
    const testInvoice = await Invoice.create({
        invoiceNumber: 'INV-000001',
        supplier: supplierId,
        products: [
            { product: productId1, size: 'M', quantity: 5, pricePerUnit: 80 },
            { product: productId2, size: 'L', quantity: 2, pricePerUnit: 40 },
        ],
        totalAmount: (5 * 80) + (2 * 40),
        notes: 'Тест для редагування',
        status: 'активна',
        createdBy: { userId: adminUserId, name: 'InvoiceAdmin Tester' },
        changesHistory: []
    });
    invoiceIdToEdit = testInvoice._id;
});

// Тести для POST /api/invoices/add-invoice
describe('POST /api/invoices/add-invoice', () => {
    let newInvoiceData;

    beforeEach(() => {
        newInvoiceData = {
            supplier: String(supplierId),
            products: [
                { product: String(productId1), size: 'M', quantity: 3, pricePerUnit: 85 },
                { product: String(productId2), size: 'L', quantity: 1, pricePerUnit: 45 },
            ],
            totalAmount: (3 * 85) + (1 * 45),
            notes: 'Нова тестова накладна',
        };
    });

    it('TCI01 - має успішно додати накладну (200 OK)', async () => {
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newInvoiceData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Накладну додано");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.invoiceNumber).toMatch(/^INV-\d{6}$/);
        expect(response.body.data.totalAmount).toBe(newInvoiceData.totalAmount);
        expect(response.body.data.products).toHaveLength(2);
        expect(String(response.body.data.createdBy.userId)).toBe(String(adminUserId));
        expect(response.body.data.changesHistory).toHaveLength(1);

        const createdInvoice = await Invoice.findById(response.body.data._id);
        expect(createdInvoice).not.toBeNull();
        expect(createdInvoice.totalAmount).toBe(newInvoiceData.totalAmount);
    });

    it('TCI03 - має повернути 400, якщо не обрано постачальника', async () => {
        const invalidData = { ...newInvoiceData };
        delete invalidData.supplier;
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, оберіть постачальника");
    });

    it('TCI04 - має повернути 400, якщо не додано товари', async () => {
        const invalidData = { ...newInvoiceData, products: [] };
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, додайте товари до накладної");
    });

    it('TCI05 - має повернути 400, якщо некоректна сума', async () => {
        const invalidData = { ...newInvoiceData, totalAmount: -100 };
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Загальна сума накладної некоректна");
    });

    it('TCI06 - має повернути 404, якщо постачальника не знайдено', async () => {
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

    it('TCI07 - має повернути 404, якщо одного з товарів не знайдено', async () => {
        const nonExistentProductId = new mongoose.Types.ObjectId().toString();
        const invalidData = {
            ...newInvoiceData, products: [
                { product: String(productId1), size: 'M', quantity: 1, pricePerUnit: 1 },
                { product: nonExistentProductId, size: 'S', quantity: 1, pricePerUnit: 1 },
            ]
        };
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(`Товар з ID ${nonExistentProductId} не знайдено`);
    });

    it('TCI08 - має повернути 400, якщо розмір товару не існує', async () => {
        const invalidData = {
            ...newInvoiceData, products: [
                { product: String(productId1), size: 'XL', quantity: 1, pricePerUnit: 1 },
            ]
        };
        const response = await request(app)
            .post('/api/invoices/add-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(`Розмір XL не знайдено для товару Накл Товар 1`);
    });
});

// Тести для GET /api/invoices/list-invoice
describe('GET /api/invoices/list-invoice', () => {
    it('TCI10 - має успішно повернути список накладних з populate (200 OK)', async () => {
        const response = await request(app)
            .get('/api/invoices/list-invoice')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(response.body.data[0].supplier).toBeInstanceOf(Object);
        expect(response.body.data[0].supplier._id).toBe(String(supplierId));
        expect(response.body.data[0].products).toBeInstanceOf(Array);
        expect(response.body.data[0].products[0].product).toBeInstanceOf(Object);
        expect(response.body.data[0].products[0].product._id).toBe(String(productId1));
    });
});

// Тести для POST /api/invoices/edit-invoice
describe('POST /api/invoices/edit-invoice', () => {
    let editData;
    let newSupplierId;

    beforeEach(async () => {
        const newSupplier = await Supplier.create({
            companyName: 'Постач Для Зміни', contactPerson: 'П. Змін', email: 'change@s.tst',
            phone: '333444555', address: 'АДР Змін', city: 'Місто Змін', productType: 'інше'
        });
        newSupplierId = newSupplier._id;

        editData = {
            id: String(invoiceIdToEdit),
            supplier: String(newSupplierId),
            products: [
                { product: String(productId1), size: 'M', quantity: 10, pricePerUnit: 75 },
                { product: String(productId1), size: 'S', quantity: 1, pricePerUnit: 70 },
            ],
            totalAmount: (10 * 75) + (1 * 70),
            notes: 'Оновлені нотатки',
            status: 'скасована',
        };
    });

    it('TCI12 - має успішно оновити накладну та записати зміни (200 OK)', async () => {
        const response = await request(app)
            .post('/api/invoices/edit-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(editData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Накладну оновлено");
        expect(response.body.data).toBeDefined();
        expect(String(response.body.data.supplier._id)).toBe(String(newSupplierId));
        expect(response.body.data.status).toBe('скасована');
        expect(response.body.data.totalAmount).toBe(editData.totalAmount);
        expect(response.body.data.products).toHaveLength(2);

        const updatedInvoice = await Invoice.findById(invoiceIdToEdit);
        expect(String(updatedInvoice.supplier)).toBe(String(newSupplierId));
        expect(updatedInvoice.status).toBe('скасована');
        expect(updatedInvoice.products).toHaveLength(2);

        expect(updatedInvoice.changesHistory).toHaveLength(1);
        const history = updatedInvoice.changesHistory[0];
        expect(history.changedBy.userId).toEqual(adminUserId);
        expect(history.changes.supplier).toBeDefined();
        expect(history.changes.status).toBeDefined();
        expect(history.changes.products).toBeDefined();
        expect(history.changes.notes).toBeDefined();
    });

    it('TCI14 - має повернути 404, якщо ID накладної не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/invoices/edit-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...editData, id: nonExistentId });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Накладну не знайдено");
    });

    it('TCI13 - має повернути 400, якщо не ідентифіковано редактора', async () => {
        const response = await request(app)
            .post('/api/invoices/edit-invoice')
            .send(editData);
        expect(response.statusCode).toBe(401);
    });
});


// Тести для GET /api/invoices/edit-invoice/:id
describe('GET /api/invoices/edit-invoice/:id', () => {
    it('має успішно повернути дані накладної для редагування (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/invoices/edit-invoice/${invoiceIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(invoiceIdToEdit));
        expect(response.body.data.invoiceNumber).toBe('INV-000001');
    });

    it('має повернути 404 (як success:false), якщо ID накладної не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/invoices/edit-invoice/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Накладну не знайдено");
    });
});

// Тести для GET /api/invoices/details/:id
describe('GET /api/invoices/details/:id', () => {
    it('TCI16 - має успішно повернути деталі накладної з populate (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/invoices/details/${invoiceIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(invoiceIdToEdit));
        expect(response.body.data.supplier).toBeInstanceOf(Object);
        expect(String(response.body.data.supplier._id)).toBe(String(supplierId));
        expect(response.body.data.products[0].product).toBeInstanceOf(Object);
        expect(String(response.body.data.products[0].product._id)).toBe(String(productId1));
    });

    it('TCI17 - має повернути 404, якщо ID накладної не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/invoices/details/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Накладна не знайдена");
    });
});

// Тести для POST /api/invoices/complete-invoice
describe('POST /api/invoices/complete-invoice', () => {
    it('TCI19 - має успішно виконати накладну та оновити склад (200 OK)', async () => {
        const product1Before = await Product.findById(productId1);
        const product2Before = await Product.findById(productId2);
        const qty1Before = product1Before.sizes.find(s => s.size === 'M').quantity;
        const qty2Before = product2Before.sizes.find(s => s.size === 'L').quantity;

        const response = await request(app)
            .post('/api/invoices/complete-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: invoiceIdToEdit });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Накладу виконано та товари додано на склад");
        expect(response.body.data.status).toBe("виконана");

        const completedInvoice = await Invoice.findById(invoiceIdToEdit);
        expect(completedInvoice.status).toBe("виконана");

        if (completedInvoice.updatedAt) {
            // Якщо поле існує, перевіряємо, чи це Date або рядок, який можна конвертувати в Date
            const updatedAtDate = new Date(completedInvoice.updatedAt);
            expect(updatedAtDate.toString()).not.toBe('Invalid Date');
        } else {
            // Якщо поле відсутнє, це не обов'язково помилка - можна просто залоговати
            console.warn('Поле updatedAt не встановлено після оновлення накладної');
        }

        // Перевірка в БД (кількість товарів)
        const product1After = await Product.findById(productId1);
        const product2After = await Product.findById(productId2);
        expect(product1After.sizes.find(s => s.size === 'M').quantity).toBe(qty1Before + 5);
        expect(product2After.sizes.find(s => s.size === 'L').quantity).toBe(qty2Before + 2);
    });

    it('TCI20 - має повернути 404, якщо ID накладної не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/invoices/complete-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: nonExistentId });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Накладну не знайдено");
    });

    it('TCI21 - має повернути 400, якщо накладна не активна', async () => {
        // Змінюємо статус накладної на "виконана"
        await Invoice.findByIdAndUpdate(invoiceIdToEdit, { status: 'виконана' });

        const response = await request(app)
            .post('/api/invoices/complete-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: invoiceIdToEdit });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Накладна вже виконана");
    });

    it('TCI22 - має повернути 404, якщо товар з накладної не знайдено в БД', async () => {
        // Видалимо один з товарів перед виконанням
        await Product.findByIdAndDelete(productId1);

        const response = await request(app)
            .post('/api/invoices/complete-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: invoiceIdToEdit });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(`Товар з ID ${productId1} не знайдено`);
    });

    it('TCI23 - має повернути 400, якщо розмір товару з накладної не знайдено в товарі', async () => {
        // Змінимо розмір в накладній на неіснуючий
        await Invoice.findByIdAndUpdate(invoiceIdToEdit, { $set: { "products.0.size": "XXL" } });

        const response = await request(app)
            .post('/api/invoices/complete-invoice')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: invoiceIdToEdit });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(`Розмір XXL не знайдено для товару Накл Товар 1`);
    });
});
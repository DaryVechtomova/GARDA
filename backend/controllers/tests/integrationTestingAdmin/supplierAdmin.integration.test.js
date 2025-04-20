import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'; // Потрібен для генерації токенів
import bcrypt from 'bcrypt'; // Потрібен для створення тестових паролів
import { app } from '../../../server.js'; // Імпортуємо наш Express app
import Supplier from '../../../models/supplierModel.js'; // Реальна модель постачальника
import Invoice from '../../../models/invoiceModel.js';   // Реальна модель накладної
import User from '../../../models/userModel.js';       // Модель користувача для створення адміна

// --- Налаштування Тестового Середовища ---
let adminToken; // Токен для аутентифікації адміна/співробітника
let adminUserId;
let supplierIdToEdit; // ID створеного постачальника для тестів
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_suppliers';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_suppliers';

// Функція для генерації JWT токена
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Suppliers)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_suppliers') {
        console.warn('Warning: Using fallback JWT secret for tests (Suppliers).');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Suppliers)');
});

beforeEach(async () => {
    // Очищення колекцій
    await Supplier.deleteMany({});
    await Invoice.deleteMany({});
    await User.deleteMany({});

    // Створення тестового адміністратора
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminPassSupp123', salt);
    const admin = await User.create({
        firstName: 'SupplierAdmin',
        secondName: 'Tester',
        middleName: 'S.',
        email: 'supplier.admin@test.com',
        phoneNumber: '555666777',
        password: hashedPassword,
        role: 'адміністратор',
        isActive: true,
        birthDate: new Date('1991-01-01'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    // Створення тестового постачальника
    const testSupplier = await Supplier.create({
        companyName: 'Тест Постачальник До Редагування',
        contactPerson: 'Особа До',
        email: 'before@edit.com',
        phone: '+380990000001',
        address: 'Адреса До',
        city: 'Місто До',
        country: 'Україна',
        productType: 'взуття',
        status: 'активний',
    });
    supplierIdToEdit = testSupplier._id;
});

// =========================================
// === Тести для POST /api/suppliers/add-supplier ===
// =========================================
describe('POST /api/suppliers/add-supplier', () => {
    const newSupplierData = {
        companyName: 'Новий Постач Інтегр',
        contactPerson: 'Контакт Новий',
        email: 'new.supplier@integration.test',
        phone: '+380991112233',
        address: 'Нова Адреса Інтегр',
        city: 'Нове Місто',
        country: 'Україна',
        productType: 'аксесуари',
        status: 'активний',
        notes: 'Інтеграційні нотатки',
    };

    it('TCS01 - має успішно додати постачальника (200 OK)', async () => {
        const response = await request(app)
            .post('/api/suppliers/add-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newSupplierData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Постачальника додано");

        // Перевірка в БД
        const createdSupplier = await Supplier.findOne({ companyName: newSupplierData.companyName });
        expect(createdSupplier).not.toBeNull();
        expect(createdSupplier.email).toBe(newSupplierData.email);
        expect(createdSupplier.status).toBe(newSupplierData.status);
    });

    it('TCS02 - має повернути 400, якщо компанія з такою назвою вже існує', async () => {
        // Спочатку створюємо постачальника з такою назвою
        await Supplier.create({ ...newSupplierData });

        const response = await request(app)
            .post('/api/suppliers/add-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newSupplierData); // Надсилаємо ті ж дані

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Компанія з такою назвою вже існує");
    });

    it('TCS03 - має повернути 400, якщо відсутня назва компанії', async () => {
        const invalidData = { ...newSupplierData };
        delete invalidData.companyName;
        const response = await request(app)
            .post('/api/suppliers/add-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть назву компанії");
    });

    it('TCS10 - має повернути 400, якщо productType не обрано', async () => {
        const invalidData = { ...newSupplierData, productType: 'Оберіть тип продукції' };
        const response = await request(app)
            .post('/api/suppliers/add-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, оберіть тип продукції");
    });

    it('TCS11 - має повернути 400, якщо status не обрано', async () => {
        const invalidData = { ...newSupplierData, status: 'Оберіть статус' };
        const response = await request(app)
            .post('/api/suppliers/add-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, оберіть статус");
    });

    // Додай тести на 401 (без токену) і 403 (не адмін/комірник)
});

// =========================================
// === Тести для GET /api/suppliers/list-supplier ===
// =========================================
describe('GET /api/suppliers/list-supplier', () => {
    it('TCS13 - має успішно повернути список постачальників (200 OK)', async () => {
        const response = await request(app)
            .get('/api/suppliers/list-supplier')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        // Має бути хоча б один постачальник, створений у beforeEach
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(response.body.data.some(s => s._id === String(supplierIdToEdit))).toBe(true);
    });

    // Додай тести на 401 і 403
});

// =========================================
// === Тести для POST /api/suppliers/remove ===
// =========================================
describe('POST /api/suppliers/remove', () => {
    it('TCS15 - має успішно видалити постачальника без накладних (200 OK)', async () => {
        const response = await request(app)
            .post('/api/suppliers/remove')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: supplierIdToEdit });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Постачальника видалено");

        // Перевірка в БД
        const deletedSupplier = await Supplier.findById(supplierIdToEdit);
        expect(deletedSupplier).toBeNull();
    });

    it('TCS16 - має повернути 404, якщо ID постачальника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/suppliers/remove')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: nonExistentId });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Постачальника не знайдено");
    });

    it('TCS17 - має повернути 400, якщо у постачальника є накладні', async () => {
        // Створюємо залежну накладну з усіма обов'язковими полями
        await Invoice.create({
            invoiceNumber: 'INV-SUP-TEST-001',
            supplier: supplierIdToEdit,
            products: [{
                product: new mongoose.Types.ObjectId(),
                size: 'S',
                quantity: 1,
                purchasePrice: 5,
                pricePerUnit: 5 // Додаємо обов'язкове поле
            }],
            totalAmount: 5,
            status: 'активна',
            createdBy: {
                name: 'Test User',
                userId: adminUserId
            }
        });

        const response = await request(app)
            .post('/api/suppliers/remove')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: supplierIdToEdit });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Не можна видалити постачальника, у якого є накладні");

        // Перевірка, що постачальника не видалено
        const supplier = await Supplier.findById(supplierIdToEdit);
        expect(supplier).not.toBeNull();
    });

    // Додай тести на 401 і 403
});

// =========================================
// === Тести для POST /api/suppliers/edit-supplier ===
// =========================================
describe('POST /api/suppliers/edit-supplier', () => {
    let editData;

    beforeEach(() => {
        editData = {
            id: String(supplierIdToEdit), // ID постачальника, створеного в beforeEach
            companyName: 'Оновлений Постач',
            contactPerson: 'Оновл Контакт',
            email: 'updated.supplier@test.com',
            phone: '+380999999999',
            address: 'Оновлена Адреса',
            city: 'Оновлене Місто',
            country: 'Україна',
            productType: 'одяг',
            status: 'призупинений', // Змінюємо статус
            notes: 'Оновлені нотатки',
        };
    });

    it('TCS21 - має успішно оновити постачальника (200 OK)', async () => {
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(editData);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Постачальника оновлено");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.companyName).toBe(editData.companyName);
        expect(response.body.data.status).toBe(editData.status);
        expect(response.body.data.cooperationEndDate).toBeUndefined(); // Не має встановлюватись для 'призупинений'

        // Перевірка в БД
        const updatedSupplier = await Supplier.findById(supplierIdToEdit);
        expect(updatedSupplier.companyName).toBe(editData.companyName);
        expect(updatedSupplier.status).toBe(editData.status);
        expect(updatedSupplier.cooperationEndDate).toBeFalsy(); // Має бути null або undefined
    });

    it('TCS22 - має встановити cooperationEndDate при зміні статусу на "завершений"', async () => {
        const dataWithFinishedStatus = { ...editData, status: 'завершений' };
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dataWithFinishedStatus);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('завершений');
        expect(response.body.data.cooperationEndDate).toBeDefined();
        expect(new Date(response.body.data.cooperationEndDate)).toBeInstanceOf(Date);

        // Перевірка в БД
        const updatedSupplier = await Supplier.findById(supplierIdToEdit);
        expect(updatedSupplier.status).toBe('завершений');
        expect(updatedSupplier.cooperationEndDate).toBeInstanceOf(Date);
    });

    it('TCS23 - має скинути cooperationEndDate при зміні статусу з "завершений" на "активний"', async () => {
        // Спочатку встановлюємо статус "завершений"
        await Supplier.findByIdAndUpdate(supplierIdToEdit, { status: 'завершений', cooperationEndDate: new Date() });

        const dataWithActiveStatus = { ...editData, status: 'активний' };
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dataWithActiveStatus);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('активний');
        // У відповіді cooperationEndDate може бути undefined або '', залежно від Mongoose
        expect(response.body.data.cooperationEndDate).toBeFalsy();

        // Перевірка в БД
        const updatedSupplier = await Supplier.findById(supplierIdToEdit);
        expect(updatedSupplier.status).toBe('активний');
        expect(updatedSupplier.cooperationEndDate).toBeFalsy(); // null або undefined
    });

    it('TCS24 - має повернути 400, якщо назва компанії вже існує в іншого постачальника', async () => {
        // Створюємо іншого постачальника з такою ж назвою
        await Supplier.create({ companyName: 'НазваДублікат', contactPerson: 'c', email: 'e@d.c', phone: 'p', address: 'a', city: 'c', productType: 'одяг' });
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...editData, companyName: 'НазваДублікат' }); // Намагаємось змінити на існуючу

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Компанія з такою назвою вже існує");
    });

    it('TCS25 - має повернути 400, якщо відсутня назва компанії при редагуванні', async () => {
        const invalidData = { ...editData };
        delete invalidData.companyName;
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть назву компанії");
    });

    it('TCS26 - має повернути 404, якщо ID постачальника для редагування не існує (findById)', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/suppliers/edit-supplier')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...editData, id: nonExistentId }); // Передаємо неіснуючий ID

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Постачальника не знайдено");
    });

    // Додай тести на 401 і 403
});


// =========================================
// === Тести для GET /api/suppliers/edit-supplier/:id ===
// =========================================
describe('GET /api/suppliers/edit-supplier/:id', () => {
    it('має успішно повернути дані постачальника для редагування (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/suppliers/edit-supplier/${supplierIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data._id).toBe(String(supplierIdToEdit));
        expect(response.body.data.companyName).toBe('Тест Постачальник До Редагування');
    });

    it('має повернути 404 (як success:false), якщо ID постачальника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/suppliers/edit-supplier/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200); // Роут повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Постачальника не знайдено");
    });
    // Додай тести на 401 і 403
});


// =========================================
// === Тести для GET /api/suppliers/details/:id ===
// =========================================
describe('GET /api/suppliers/details/:id', () => {
    it('має успішно повернути деталі постачальника (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/suppliers/details/${supplierIdToEdit}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(String(supplierIdToEdit));
    });

    it('має повернути 404 (як success:false), якщо ID постачальника не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/suppliers/details/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200); // Роут повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Постачальника не знайдено");
    });
    // Додай тести на 401 і 403
});
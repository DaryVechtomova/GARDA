const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { app } = require('../../../server');
const User = require('../../../models/userModel');
const Product = require('../../../models/productModel');
const Order = require('../../../models/orderModel');
const Supplier = require('../../../models/supplierModel');
const Invoice = require('../../../models/invoiceModel');

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken;
let adminUserId, nonAdminUserId, employeeId;
let supplierId;
let productId1, productId2, productId3;
let orderIdNew, orderIdProcessing, orderIdDelivered;
let invoiceIdActive, invoiceIdCompleted;
let invoiceIdCancelled;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_validation';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_validation_tests';
const UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', '..', 'test-uploads-validation');

// Функції-хелпери
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};
const generateToken = (userId, role) => {
    const payload = { id: userId, role: role };
    if (!JWT_SECRET || JWT_SECRET === 'your_fallback_secret_for_validation_tests') {
        console.error("FATAL: JWT_SECRET is not defined or using fallback in generateToken!");
        return 'invalid_token_due_to_missing_secret';
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};
const createTestFile = (filename, content = 'val test content') => {
    const filePath = path.join(UPLOAD_DIR_ABSOLUTE, filename);
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
    } catch (err) {
        console.error(`Error creating test file ${filePath}:`, err);
    }
    return filePath;
};

beforeAll(async () => {
    // Перевірка та створення папки
    if (!fs.existsSync(UPLOAD_DIR_ABSOLUTE)) {
        fs.mkdirSync(UPLOAD_DIR_ABSOLUTE, { recursive: true });
    }
    // Підключення до БД
    try {
        await mongoose.connect(TEST_MONGO_URI);
        console.log('Connected to Test DB (Validation)');
    } catch (err) {
        console.error("Failed to connect to Validation Test DB:", err);
        process.exit(1);
    }
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_validation_tests') {
        console.warn('Warning: Using fallback JWT secret for validation tests.');
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test DB connection closed (Validation)');
    // Очищення тестової папки
    try {
        fs.rmSync(UPLOAD_DIR_ABSOLUTE, { recursive: true, force: true });
    } catch (err) {
        console.error('Error cleaning up validation upload directory:', err);
    }
});

beforeEach(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Створення користувачів
    const adminPassword = await hashPassword('ValAdminPass1');
    const admin = await User.create({ firstName: 'ValAdmin', secondName: 'Valid', middleName: 'V', email: 'val.admin@test.com', phoneNumber: '111000111', password: adminPassword, role: 'адміністратор', isActive: true, birthDate: new Date('1980-01-01') });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');

    const empPassword = await hashPassword('ValEmpPass1');
    const employee = await User.create({ firstName: 'ValEmp', secondName: 'Worker', middleName: 'E', email: 'val.emp@test.com', phoneNumber: '222000222', password: empPassword, role: 'комірник', isActive: true, birthDate: new Date('1990-02-02') });
    employeeId = employee._id;
    nonAdminToken = generateToken(employeeId, 'комірник'); // Токен комірника

    // Створення постачальника
    const supplier = await Supplier.create({ companyName: 'Validation Supplier Base', contactPerson: 'VSB', email: 'vsb@t.c', phone: '333000333', address: 'VAB', city: 'VCB', productType: 'одяг' });
    supplierId = supplier._id;

    // Створення товарів
    const p1 = await Product.create({ name: 'Val Prod 1', description: 'vp1', price: 150, category: 'vc1', images: ['vp1.jpg'], colors: 'val_red', sizes: [{ size: 'M', quantity: 10 }] });
    const p2 = await Product.create({ name: 'Val Prod 2', description: 'vp2', price: 80, category: 'vc2', images: ['vp2.jpg'], colors: 'val_blue', sizes: [{ size: 'L', quantity: 20 }] });
    const p3 = await Product.create({ name: 'Val Prod 3 No Size', description: 'vp3', price: 50, category: 'vc3', images: ['vp3.jpg'], colors: 'val_green', sizes: [] }); // Товар без розмірів спочатку
    productId1 = p1._id;
    productId2 = p2._id;
    productId3 = p3._id; // ID товару без розмірів

    // Створення замовлень
    const ordNew = await Order.create({ userId: adminUserId, /* Simplification */ orderNumber: 'VAL001SYS', status: 'Нове замовлення', items: [{ productId: productId1, name: 'Val Prod 1', price: 150, size: 'M', image: 'vp1.jpg', quantity: 1 }], amount: 150, deliveryMethod: 'Нова Пошта', deliveryDetails: { firstName: 'Val', lastName: 'Client', middleName: 'C', email: 'valc@t.c', phone: '+380998887766', region: 'VR', city: 'VC', departmentNumber: '1' } });
    orderIdNew = ordNew._id;
    const ordProcessing = await Order.create({ userId: adminUserId, orderNumber: 'VAL002SYS', status: 'В обробці', items: [{ productId: productId2, name: 'Val Prod 2', price: 80, size: 'L', image: 'vp2.jpg', quantity: 2 }], amount: 160, deliveryMethod: 'Самовивіз', deliveryDetails: { firstName: 'Val2', lastName: 'Client2', middleName: 'C2', email: 'valc2@t.c', phone: '+380998887755', city: 'Київ' } });
    orderIdProcessing = ordProcessing._id;
    const ordDelivered = await Order.create({ userId: adminUserId, orderNumber: 'VAL003SYS', status: 'Доставлено', items: [{ productId: productId1, name: 'Val Prod 1', price: 150, size: 'M', image: 'vp1.jpg', quantity: 1 }], amount: 150, deliveryMethod: 'Укрпошта', deliveryDetails: { firstName: 'Val3', lastName: 'Client3', middleName: 'C3', email: 'valc3@t.c', phone: '+380998887744', region: 'R3', city: 'C3', postalCode: '12345', street: 'S3', houseNumber: '3' } });
    orderIdDelivered = ordDelivered._id;


    // Створення накладної
    const invActive = await Invoice.create({ invoiceNumber: 'INV-VAL-SYS-001', supplier: supplierId, status: 'активна', products: [{ product: productId1, size: 'M', quantity: 5, pricePerUnit: 120 }], totalAmount: 600, createdBy: { userId: adminUserId, name: 'ValidationAdmin Valid' } });
    invoiceIdActive = invActive._id;

    // Створення скасованої накладної
    const invCancelled = await Invoice.create({
        invoiceNumber: 'INV-VAL-SYS-002',
        supplier: supplierId,
        status: 'скасована',
        products: [{ product: productId1, size: 'M', quantity: 5, pricePerUnit: 120 }],
        totalAmount: 600,
        createdBy: { userId: adminUserId, name: 'ValidationAdmin Valid' }
    });
    invoiceIdCancelled = invCancelled._id;

    // Переконайтеся, що товар має розмір 'S'
    await Product.findByIdAndUpdate(productId1, {
        $push: { sizes: { size: 'S', quantity: 10 } }
    });

    // Очистка тестової папки uploads
    const files = fs.readdirSync(UPLOAD_DIR_ABSOLUTE);
    for (const file of files) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR_ABSOLUTE, file)); } catch (e) { }
    }
});


// Валідаційні Тести для Admin Roles 
describe('Валідаційне тестування: Адміністратор', () => {

    // --- FR01: Авторизація Адміністратора ---
    describe('[FR01] Авторизація Адміністратора', () => {
        test('TC_FR01_VT01: Успішний вхід', async () => {
            const response = await request(app).post('/api/user/login')
                .send({ email: 'val.admin@test.com', password: 'ValAdminPass1' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.role).toBe('адміністратор');
        });
        test('TC_FR01_VT02: Невірний пароль', async () => {
            const response = await request(app).post('/api/user/login')
                .send({ email: 'val.admin@test.com', password: 'wrong' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Некоректні дані');
        });
        test('TC_FR01_VT03: Неіснуючий email', async () => {
            const response = await request(app).post('/api/user/login')
                .send({ email: 'noexist@test.com', password: 'ValAdminPass1' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Такого користувача не існує');
        });
        test('TC_FR01_VT04: Звільнений адміністратор', async () => {
            // Спочатку "звільняємо" адміна в БД
            await User.findByIdAndUpdate(adminUserId, { isActive: false });
            const response = await request(app).post('/api/user/login')
                .send({ email: 'val.admin@test.com', password: 'ValAdminPass1' });
            expect(response.statusCode).toBe(403); // Перевірка на 403
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Ваш акаунт неактивний');
        });
        test('TC_FR01_VT05 (NFR04): Без пароля', async () => {
            const response = await request(app).post('/api/user/login')
                .send({ email: 'val.admin@test.com' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Некоректні дані');
        });
    });

    // --- FR02: Реєстрація Співробітника ---
    describe('[FR02] Реєстрація Співробітника', () => {
        const empData = { firstName: 'ValEmpReg', secondName: 'Valid', middleName: 'R', email: 'val.reg@test.com', phoneNumber: '123123123', password: 'passwordValid1', birthDate: '1999-12-12' };

        test('TC_FR02_VT06: Успішна реєстрація адміністратора', async () => {
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...empData, role: 'адміністратор' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Співробітника успішно додано");
            const created = await User.findOne({ email: empData.email });
            expect(created.role).toBe('адміністратор');
        });
        test('TC_FR02_VT07: Успішна реєстрація комірника', async () => {
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...empData, email: 'val.reg.kom@test.com', role: 'комірник' }); // Інший email
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const created = await User.findOne({ email: 'val.reg.kom@test.com' });
            expect(created.role).toBe('комірник');
        });
        test('TC_FR02_VT08 (NFR04/NFR06): Існуючий email', async () => {
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...empData, email: 'val.emp@test.com' }); // Email існуючого співр.
            expect(response.statusCode).toBe(200); // Controller returns 200
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Такий користувач вже існує");
        });
        test('TC_FR02_VT09 (NFR04): Відсутній firstName', async () => {
            const invalidData = { ...empData }; delete invalidData.firstName;
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`).send(invalidData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть ім'я");
        });
        test('TC_FR02_VT10 (NFR04): Короткий пароль', async () => {
            const invalidData = { ...empData, password: 'short' };
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${adminToken}`).send(invalidData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Пароль має містити щонайменше 8 символів");
        });
        test('TC_FR02_VT11 (Auth/NFR03): Комірник не може реєструвати', async () => {
            const response = await request(app).post('/api/user/register-employee')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send(empData);
            expect(response.statusCode).toBe(403); // strictAdminMiddleware
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });
    });

    // --- FR04: Редагування Співробітника ---
    describe('[FR04] Редагування Співробітника', () => {
        const editDataBase = { phoneNumber: '999999999', firstName: "Edit", secondName: "Emp", middleName: "E", birthDate: "1990-10-10", role: "комірник" };

        test('TC_FR04_VT12: Успішне редагування', async () => {
            const response = await request(app).post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editDataBase, id: String(employeeId), email: 'edited.val.emp@test.com' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Співробітника успішно оновлено");
            expect(response.body.data.phoneNumber).toBe('999999999');
            const updated = await User.findById(employeeId);
            expect(updated.phoneNumber).toBe('999999999');
        });
        test('TC_FR04_VT13 (NFR04/NFR06): Спроба встановити існуючий email', async () => {
            const response = await request(app).post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...editDataBase, id: String(employeeId), email: 'val.admin@test.com' }); // Email адміна
            expect(response.statusCode).toBe(400); // Очікуємо 400 від контролера
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Користувач з такою електронною поштою вже існує");
        });
        test('TC_FR04_VT14 (NFR04): Редагування без обов\'язкового поля (lastName)', async () => {
            const invalidData = { ...editDataBase, id: String(employeeId), email: 'valid.edit@test.com' };
            delete invalidData.secondName; // Видаляємо прізвище
            const response = await request(app).post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(200); // Контролер повертає 200
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, введіть прізвище");
        });
        test('TC_FR04_VT15 (Auth/NFR03): Комірник не може редагувати', async () => {
            const response = await request(app).post('/api/user/edit-employee')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен комірника
                .send({ ...editDataBase, id: String(employeeId), email: 'nonadmin.edit@test.com' });
            expect(response.statusCode).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });
    });

    // --- FR09: Додавання Товарів ---
    describe('[FR09] Додавання Нових Товарів', () => {
        //let filePath;
        const productData = { name: 'ValAddProduct', description: 'ValAddDesc', price: '500', category: 'ValAddCat', colors: 'val_add_color', sizes: JSON.stringify([{ size: 'S', quantity: 5 }]) };
        // beforeAll(() => { filePath = createTestFile('val_add.png'); });
        const filePath = path.join(__dirname, 'test-image.jpg'); // Створіть тестовий файл
        const fileContent = 'test image content';

        beforeAll(() => {
            fs.writeFileSync(filePath, fileContent);
        });

        afterAll(() => {
            fs.unlinkSync(filePath);
        });

        test('TC_FR09_VT16: Успішне додавання товару', async () => {
            const response = await request(app).post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', productData.name).field('description', productData.description)
                .field('price', productData.price).field('category', productData.category)
                .field('colors', productData.colors).field('sizes', productData.sizes)
                .attach('images', filePath);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Товар додано");
            expect(response.body.data.name).toBe(productData.name);
            const created = await Product.findOne({ name: productData.name });
            expect(created).not.toBeNull();
        });
        test('TC_FR09_VT17 (NFR04): Без назви', async () => {
            const response = await request(app).post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('description', productData.description).field('price', productData.price)
                .field('category', productData.category).field('colors', productData.colors)
                .field('sizes', productData.sizes).attach('images', filePath);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Будь ласка, введіть назву товару");
        });
        test('TC_FR09_VT18 (NFR04): Ціна 0', async () => {
            const response = await request(app).post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'ZeroPrice').field('description', productData.description)
                .field('price', '0').field('category', productData.category)
                .field('colors', productData.colors).field('sizes', productData.sizes)
                .attach('images', filePath);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Ціна має бути більше 0");
        });
        test('TC_FR09_VT19 (NFR04): Без зображень', async () => {
            const response = await request(app).post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'NoImageProd').field('description', productData.description)
                .field('price', productData.price).field('category', productData.category)
                .field('colors', productData.colors).field('sizes', productData.sizes);
            // Без .attach
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Будь ласка, завантажте хоча б одне зображення товару");
        });
        test('TC_FR09_VT20 (NFR04): Дублікат розміру', async () => {
            const sizesDup = JSON.stringify([{ size: 'L', quantity: 1 }, { size: 'L', quantity: 2 }]);
            const response = await request(app).post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'DupSizeProd').field('description', productData.description)
                .field('price', productData.price).field('category', productData.category)
                .field('colors', 'dup_size_color').field('sizes', sizesDup) // Дублікат
                .attach('images', filePath);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Розміри товару не повинні дублюватись");
        });
    });

    // --- FR010: Перегляд Списку Товарів ---
    describe('[FR010] Перегляд Списку Товарів', () => {
        test('TC_FR010_VT21: Успішне отримання списку', async () => {
            // beforeEach створив 2 товари
            const response = await request(app).get('/api/product/list-product');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            expect(response.body.data[0].discountedPrice).toBeDefined(); // Перевірка наявності ціни зі знижкою
        });
    });

    // --- FR011: Редагування Товарів ---
    describe('[FR011] Редагування Товарів', () => {
        test('TC_FR011_VT22: Успішне редагування опису та ціни', async () => {
            const response = await request(app).post('/api/product/edit-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('id', String(productId1))
                .field('name', 'Val Prod 1') // Назва та колір не змінюються
                .field('description', 'Новий Опис Редагування')
                .field('price', '165')
                .field('category', 'vc1') // Інші поля теж краще передати
                .field('colors', 'val_red')
                .field('existingImages', JSON.stringify((await Product.findById(productId1)).images)); // Залишаємо старі фото

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.description).toBe('Новий Опис Редагування');
            expect(response.body.data.price).toBe(165);
            const updated = await Product.findById(productId1);
            expect(updated.description).toBe('Новий Опис Редагування');
            expect(updated.price).toBe(165);
        });
        test('TC_FR011_VT23 (NFR04/NFR06): Редагування з існуючою назвою+кольором', async () => {
            // Використовуємо дані другого товару для першого
            const response = await request(app).post('/api/product/edit-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('id', String(productId1)) // Редагуємо перший
                .field('name', 'Val Prod 2') // Назва другого
                .field('colors', 'val_blue') // Колір другого
                .field('description', 'd').field('price', '1').field('category', 'c');

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Товар з такою назвою та кольором вже існує");
        });
    });

    // --- FR012: Видалення Товарів ---
    describe('[FR012] Видалення Товарів', () => {
        let productIdNoDeps;
        let imgPathNoDeps;
        beforeEach(async () => {
            // Створюємо товар без залежностей
            const imgName = 'delete_no_deps.png';
            imgPathNoDeps = createTestFile(imgName);
            const p = await Product.create({ name: 'ToDeleteNoDeps', description: 'd', price: 1, category: 'c', images: [imgName], colors: 'del' });
            productIdNoDeps = p._id;
        });

        test('TC_FR012_VT24: Успішне видалення товару без залежностей', async () => {
            expect(fs.existsSync(imgPathNoDeps)).toBe(true); // Файл існує
            const response = await request(app).post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(productIdNoDeps) });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Товар видалено");
            const deleted = await Product.findById(productIdNoDeps);
            expect(deleted).toBeNull();
        });
        test('TC_FR012_VT25 (Constraint): Спроба видалити товар з активним замовленням', async () => {
            // Створюємо залежне замовлення
            await Order.create({ userId: adminUserId, orderNumber: 'DEL-ORD-01', status: 'В обробці', items: [{ productId: productIdNoDeps, name: 'ToDeleteNoDeps', price: 1, size: 'S', image: 'i.jpg', quantity: 1 }], amount: 1, deliveryMethod: 'Самовивіз', deliveryDetails: { /*...*/ firstName: 'F', lastName: 'L', middleName: 'M', email: 'd@t.c', phone: '1', city: 'Київ' } });
            const response = await request(app).post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(productIdNoDeps) });
            expect(response.statusCode).toBe(409); // Conflict
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Не можна видаляти товари, які є в замовленнях");
        });
        test('TC_FR012_VT26 (Constraint): Спроба видалити товар з активною накладною', async () => {
            await Invoice.create({ invoiceNumber: 'DEL-INV-01', supplier: supplierId, status: 'активна', products: [{ product: productIdNoDeps, size: 'M', quantity: 1, pricePerUnit: 1 }], totalAmount: 1, createdBy: { userId: adminUserId, name: 'Admin' } });
            const response = await request(app).post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(productIdNoDeps) });
            expect(response.statusCode).toBe(409); // Conflict
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Не можна видаляти товари, які є в накладних");
        });
    });

    // --- FR015: Перегляд Списку Замовлень ---
    describe('[FR015] Перегляд Списку Замовлень', () => {
        test('TC_FR015_VT27: Успішне отримання списку замовлень', async () => {
            // beforeEach створив 2 замовлення
            const response = await request(app).get('/api/order/list')
                .set('Authorization', `Bearer ${adminToken}`); // Потрібен адмін/комірник
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        });
    });

    // --- FR017: Скасування Замовлень ---
    describe('[FR017] Скасування Замовлень', () => {
        test('TC_FR017_VT28: Успішне скасування "Нового замовлення"', async () => {
            const response = await request(app).put(`/api/order/cancel/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Val test cancel reason' });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const cancelled = await Order.findById(orderIdNew);
            expect(cancelled.status).toBe('Скасовано');
            expect(cancelled.cancellationReason).toBe('Val test cancel reason');
        });
        test('TC_FR017_VT29 (Constraint): Спроба скасувати "Доставлене" замовлення', async () => {
            const response = await request(app).put(`/api/order/cancel/${orderIdDelivered}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Too late' });
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Замовлення можна скасувати тільки');
        });
        test('TC_FR017_VT30 (NFR04): Спроба скасувати без причини', async () => {
            const response = await request(app).put(`/api/order/cancel/${orderIdNew}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: "" }); // Без поля reason
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // --- FR018: Редагування Замовлень ---
    describe('[FR018] Редагування Замовлень', () => {
        let editData;
        beforeEach(() => {
            editData = {
                editReason: 'Val edit reason',
                items: [{ productId: productId1, name: 'Val Prod 1', price: 160, size: 'M', image: 'vp1.jpg', quantity: 2 }], // Змінили кількість і ціну
                amount: 320 // Нова сума
            };
        });
        test('TC_FR018_VT31: Успішне редагування складу/суми замовлення', async () => {
            const response = await request(app).post(`/api/order/edit-order/${orderIdProcessing}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(editData);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(editData.amount);
            expect(response.body.data.items[0].quantity).toBe(2);
            const updated = await Order.findById(orderIdProcessing);
            expect(updated.amount).toBe(editData.amount);
            expect(updated.items[0].quantity).toBe(2);
            expect(updated.editHistory[0].type).toBe('order_edit');
        });
        test('TC_FR018_VT32 (NFR04): Редагування без причини', async () => {
            const invalidData = { ...editData };
            delete invalidData.editReason;
            const response = await request(app).post(`/api/order/edit-order/${orderIdProcessing}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Будь ласка, оберіть причину редагування");
        });
    });

    // --- FR020: Додавання Постачальників ---
    describe('[FR020] Додавання Постачальників', () => {
        const suppData = { companyName: 'ValSupplierAdd', contactPerson: 'VSA', email: 'vsa@t.c', phone: '444', address: 'VSA Addr', city: 'VSA City', country: 'Україна', productType: 'аксесуари', status: 'активний' };
        test('TC_FR020_VT33: Успішне додавання', async () => {
            const response = await request(app).post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`).send(suppData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const created = await Supplier.findOne({ companyName: suppData.companyName });
            expect(created).not.toBeNull();
        });
        test('TC_FR020_VT34 (NFR04/NFR06): Дублікат назви компанії', async () => {
            await Supplier.create({ ...suppData }); // Створюємо спочатку
            const response = await request(app).post('/api/suppliers/add-supplier')
                .set('Authorization', `Bearer ${adminToken}`).send(suppData); // Пробуємо ще раз
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Компанія з такою назвою вже існує");
        });
    });

    // --- FR024: Створення Накладних ---
    describe('[FR024] Створення Накладних', () => {
        let invoiceData;
        beforeEach(() => {
            invoiceData = {
                supplier: String(supplierId),
                products: [{ product: String(productId1), size: 'M', quantity: 1, pricePerUnit: 100 }],
                totalAmount: 100, notes: 'Val Invoice Add'
            };
        });
        test('TC_FR024_VT35: Успішне створення', async () => {
            const response = await request(app).post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`).send(invoiceData);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.invoiceNumber).toBeDefined();
            expect(response.body.data.status).toBe('активна');
            const created = await Invoice.findById(response.body.data._id);
            expect(created).not.toBeNull();
        });
        test('TC_FR024_VT36 (NFR04): Неіснуючий постачальник', async () => {
            const invalidData = { ...invoiceData, supplier: new mongoose.Types.ObjectId().toString() };
            const response = await request(app).post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`).send(invalidData);
            expect(response.statusCode).toBe(404);
            expect(response.body.message).toBe("Постачальника не знайдено");
        });
        test('TC_FR024_VT37 (NFR04): Неіснуючий розмір товару', async () => {
            const invalidData = { ...invoiceData, products: [{ product: String(productId1), size: 'XXL', quantity: 1, pricePerUnit: 100 }] };
            const response = await request(app).post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${adminToken}`).send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain("Розмір XXL не знайдено");
        });
        test('TC_FR024_VT38 (Auth/NFR03): Комірник не може створити накладну', async () => {
            const response = await request(app).post('/api/invoices/add-invoice')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Комірник
                .send(invoiceData);
            expect(response.statusCode).toBe(403);
            expect(response.body.message).toContain("Необхідні права адміністратора");
        });
    });

    // --- FR028: Виконання Накладної та Оновлення Складу ---
    describe('[FR028] Виконання Накладної', () => {
        test('TC_FR028_VT39: Успішне виконання та оновлення складу', async () => {
            console.log('invoiceIdActive:', invoiceIdActive);

            const productBefore = await Product.findById(productId1);
            const sizeM = productBefore.sizes.find(s => s.size === 'M').quantity;
            const response = await request(app)
                .post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdActive) });
            console.log(response.body);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            const product1After = await Product.findById(productId1);
            expect(product1After.sizes.find(s => s.size === 'M').quantity).toBe(sizeM + 5);
        });
        test('TC_FR028_VT40 (Constraint): Спроба виконати скасовану', async () => {
            const response = await request(app).post('/api/invoices/complete-invoice')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(invoiceIdCancelled) });
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Накладна вже скасована");
        });
    });

    // --- NFR01: Швидкодія ---
    describe('[NFR01] Швидкодія API', () => {
        test('TC_NFR01_VT41: Час отримання списку замовлень', async () => {
            const MAX_TIME = 2500; // Припустимий час 2.5 секунди
            const start = performance.now();
            const response = await request(app).get('/api/order/list').set('Authorization', `Bearer ${adminToken}`);
            const end = performance.now();
            expect(response.statusCode).toBe(200);
            expect(end - start).toBeLessThanOrEqual(MAX_TIME);
            console.log(`[NFR01 Check] listOrders time: ${(end - start).toFixed(0)} ms`);
        }, 10000);
    });

});
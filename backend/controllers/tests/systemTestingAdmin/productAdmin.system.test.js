const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { app } = require('../../../server'); // Імпорт Express app
const Product = require('../../../models/productModel');
const Invoice = require('../../../models/invoiceModel');
const Order = require('../../../models/orderModel');
const User = require('../../../models/userModel');
const Supplier = require('../../../models/supplierModel'); // Потрібен для створення накладних

// --- Налаштування Тестового Середовища ---
let adminToken, nonAdminToken; // Додамо токен НЕ адміна
let adminUserId, nonAdminUserId;
let supplierId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_products_sys';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests_products_sys';
// Використовуємо АБСОЛЮТНИЙ шлях до папки ТЕСТОВИХ завантажень
const UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', '..', 'test-uploads');

// Функції-хелпери
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};
const createTestFile = (filename, content = 'test image content') => {
    const filePath = path.join(UPLOAD_DIR_ABSOLUTE, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
};

beforeAll(async () => {
    // Переконуємось, що тестова папка існує
    if (!fs.existsSync(UPLOAD_DIR_ABSOLUTE)) {
        fs.mkdirSync(UPLOAD_DIR_ABSOLUTE, { recursive: true });
    }
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Products System)');
    if (!process.env.JWT_SECRET && JWT_SECRET === 'your_fallback_secret_for_tests_products_sys') {
        console.warn('Warning: Using fallback JWT secret for tests (Products System).');
    }
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    try {
        const files = fs.readdirSync(UPLOAD_DIR_ABSOLUTE);
        for (const file of files) {
            try { fs.unlinkSync(path.join(UPLOAD_DIR_ABSOLUTE, file)); } catch (e) { }
        }
    } catch (err) {
        console.error('Error cleaning up test upload directory:', err);
    }
});

afterAll(async () => {
    // Очищення колекцій
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    await mongoose.connection.close();
    console.log('Test DB connection closed (Products System)');
    // Очистка тестової папки uploads після всіх тестів (обережно!)
    try {
        const files = fs.readdirSync(UPLOAD_DIR_ABSOLUTE);
        for (const file of files) {
            fs.unlinkSync(path.join(UPLOAD_DIR_ABSOLUTE, file));
        }
    } catch (err) {
        console.error('Error cleaning up test upload directory:', err);
    }
});

beforeEach(async () => {
    // Створення адміна
    const adminPassword = await hashPassword('SysProdAdminPass');
    const admin = await User.create({
        firstName: 'SysProdAdmin', secondName: 'Main', middleName: 'P',
        email: 'sysprodadmin@test.com', phoneNumber: '5050505050',
        password: adminPassword, role: 'адміністратор', isActive: true,
        birthDate: new Date('1988-01-01')
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор');
    const nonAdminPassword = await hashPassword('SysProdNonAdminPass');
    const nonAdmin = await User.create({
        firstName: 'SysProdNonAdmin', secondName: 'Worker', middleName: 'W',
        email: 'sysprodnonadmin@test.com', phoneNumber: '5151515151',
        password: nonAdminPassword, role: 'комірник', isActive: true, // Комірник
        birthDate: new Date('1990-02-02')
    });
    nonAdminUserId = nonAdmin._id;
    nonAdminToken = generateToken(nonAdminUserId, 'комірник'); // Токен Комірника

    const supplier = await Supplier.create({ companyName: 'DepSup', contactPerson: 'c', email: 'e@d.c', phone: 'p', address: 'a', city: 'c', productType: 'одяг' });
    supplierId = supplier._id;
});

// Системні Тести для Product Controller (Admin) 
describe('Системне тестування: Адміністратор - Управління товарами', () => {

    // --- Сценарій: Повний цикл CRUD для товару (FR09, FR010, FR011, FR012) ---
    describe('Сценарій: Повний цикл CRUD для товару', () => {
        // Змінна для зберігання ID між тестами (важливо: не використовуйте beforeEach, 
        // оскільки це відокремлює стан між тестами)
        let sharedProductId;
        let sharedImageNames = [];
        const testFilePath1 = path.join(__dirname, 'test-files', 'crud_img1.png');
        const testFilePath2 = path.join(__dirname, 'test-files', 'crud_img2.jpg');
        const newFilePath = path.join(__dirname, 'test-files', 'crud_new_img.gif');

        beforeAll(() => {
            // Створюємо файли для тестів
            fs.writeFileSync(testFilePath1, 'test image content 1');
            fs.writeFileSync(testFilePath2, 'test image content 2');
            fs.writeFileSync(newFilePath, 'test image content 3');
        });

        test('Крок 1 (FR09): Створення товару', async () => {
            const testFilePath1 = createTestFile('test-image1.jpg');
            const testFilePath2 = createTestFile('test-image2.jpg');
            // Перевіряємо, що файли існують
            expect(fs.existsSync(testFilePath1)).toBe(true);
            expect(fs.existsSync(testFilePath2)).toBe(true);

            const sizesData = [{ size: 'M', quantity: 5 }];

            // Виконуємо запит
            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'CRUD_Тест_Товар')
                .field('description', 'Початковий опис')
                .field('price', '100')
                .field('category', 'CRUD_Кат')
                .field('colors', 'CRUD_Колір')
                .field('sizes', JSON.stringify(sizesData))
                .attach('images', testFilePath1)
                .attach('images', testFilePath2);

            // Перевіряємо відповідь
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Товар додано");
            console.log("Створення товару: response.body =", response.body);
            expect(response.body.data._id).toBeDefined();

            // Зберігаємо для наступних тестів
            sharedProductId = response.body.data._id;
            sharedImageNames = response.body.data.images;
            console.log("Збережено productId:", sharedProductId);

            // Переконуємося, що ID та зображення встановлені
            expect(sharedProductId).toBeDefined();
            expect(sharedImageNames).toHaveLength(2);
        });

        test('Крок 2 (FR010): Перегляд списку товарів', async () => {
            // Перевіряємо чи ID товару збережено з попереднього тесту
            // Якщо попередній тест впав, то цей буде пропущено
            if (!sharedProductId) {
                console.log("Пропуск тесту: ID товару не встановлено");
                return;
            }

            const response = await request(app)
                .get('/api/product/list-product');

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            console.log("Усі продукти:", response.body.data.map(p => p._id));
            console.log("Очікуваний ID:", sharedProductId);
            // Шукаємо наш товар
            const found = response.body.data.find(p => String(p._id) === String(sharedProductId));
            expect(found).toBeDefined();
            expect(found.name).toBe('CRUD_Тест_Товар');
        });

        test('Крок 3 (FR011): Редагування товару', async () => {
            const newFilePath = createTestFile('test-image1.jpg');
            // Пропускаємо, якщо продукт не створено
            if (!sharedProductId || !sharedImageNames.length) {
                console.log("Пропуск тесту: productId або imageNames не встановлено");
                return;
            }

            // Перевіряємо, що файл для оновлення існує
            expect(fs.existsSync(newFilePath)).toBe(true);

            // Залишаємо одне зображення з двох
            const keptImageName = sharedImageNames[1];
            const existingImagesJSON = JSON.stringify([keptImageName]);

            const response = await request(app)
                .post('/api/product/edit-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('id', String(sharedProductId))
                .field('name', 'CRUD_Тест_Товар_Оновлений')
                .field('description', 'Оновлений опис')
                .field('price', '120')
                .field('category', 'CRUD_Кат_Онов')
                .field('colors', 'CRUD_Колір_Онов')
                .field('existingImages', existingImagesJSON)
                .field('sizes', JSON.stringify([{ size: 'L', quantity: 10 }]))
                .attach('images', newFilePath);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Товар оновлено");
            expect(response.body.data.name).toBe('CRUD_Тест_Товар_Оновлений');
            // Оновлюємо список зображень
            sharedImageNames = response.body.data.images;
            expect(sharedImageNames).toHaveLength(2);
        });

        test('Крок 4 (FR012): Видалення товару', async () => {
            // Пропускаємо, якщо продукт не створено
            if (!sharedProductId) {
                console.log("Пропуск тесту: productId не встановлено");
                return;
            }

            const response = await request(app)
                .post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(sharedProductId) });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Товар видалено");

            const deletedProduct = await Product.findById(sharedProductId);
            expect(deletedProduct).toBeNull();
        });
    });

    // --- Сценарій: Невдале додавання товару (FR09, NFR04, NFR02) ---
    describe('Сценарій: Невдале додавання товару', () => {
        let baseData;
        let filePath;

        beforeAll(() => {
            filePath = path.join(__dirname, 'test-files', 'fail_add.txt');
            fs.writeFileSync(filePath, 'test file content');
        });

        beforeEach(() => {
            baseData = {
                name: 'FailAdd',
                description: 'd',
                price: '50',
                category: 'c',
                colors: 'fail_color',
                sizes: JSON.stringify([{ size: 'S', quantity: 1 }])
            };
        });

        test('Крок 1 (NFR04): Відсутня ціна', async () => {
            // Перевіряємо, що файл існує
            expect(fs.existsSync(filePath)).toBe(true);

            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', baseData.name)
                .field('description', baseData.description)
                // .field('price', baseData.price) // Пропускаємо ціну
                .field('category', baseData.category)
                .field('colors', baseData.colors)
                .field('sizes', baseData.sizes)
                .attach('images', filePath);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Ціна має бути більше 0");
        });

        test('Крок 2 (NFR02): Дублювання назви+кольору', async () => {
            // Перевіряємо, що файл існує
            expect(fs.existsSync(filePath)).toBe(true);

            // Спочатку створюємо товар
            await Product.create({
                name: baseData.name,
                description: baseData.description,
                price: 50,
                category: baseData.category,
                colors: baseData.colors,
                images: ['dummy.jpg'],
                sizes: [{ size: 'S', quantity: 1 }]
            });

            // Потім пробуємо створити ще раз
            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', baseData.name)
                .field('description', baseData.description)
                .field('price', baseData.price)
                .field('category', baseData.category)
                .field('colors', baseData.colors)
                .field('sizes', baseData.sizes)
                .attach('images', filePath);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Товар з такою назвою та кольором вже існує");
        });

        test('Крок 3 (NFR04): Дублювання розмірів', async () => {
            // Перевіряємо, що файл існує
            expect(fs.existsSync(filePath)).toBe(true);

            const sizesWithDuplicates = JSON.stringify([{ size: 'S', quantity: 1 }, { size: 'S', quantity: 2 }]);

            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('name', 'UniqueNameForSizeTest')
                .field('description', baseData.description)
                .field('price', baseData.price)
                .field('category', baseData.category)
                .field('colors', 'UniqueColorForSizeTest')
                .field('sizes', sizesWithDuplicates) // Передаємо дублікати
                .attach('images', filePath);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toMatch(/Розміри.*дублюватись/);
        });
    });

    // --- Сценарій: Невдале видалення товару (FR012) ---
    describe('Сценарій: Невдале видалення товару', () => {
        let productIdWithDeps;

        beforeAll(async () => {
            const product = await Product.create({
                name: 'DeleteFail',
                description: 'd',
                price: 1,
                category: 'c',
                images: ['i.jpg'],
                colors: 'red',
                sizes: [{ size: 'M', quantity: 1 }]
            });

            productIdWithDeps = product._id;

            // Створюємо залежну накладну
            const supplier = await Supplier.create({
                companyName: 'DepSup',
                contactPerson: 'c',
                email: 'e@d.c',
                phone: 'p',
                address: 'a',
                city: 'c',
                productType: 'одяг'
            });

            await Invoice.create({
                invoiceNumber: 'INV-DEP-001',
                supplier: supplier._id,
                status: 'активна',
                totalAmount: 10,
                createdBy: { userId: adminUserId, name: 'Admin' },
                products: [{ product: productIdWithDeps, size: 'M', quantity: 1, pricePerUnit: 10 }],
            });
        });

        test('Крок 1: Спроба видалити товар з активною накладною', async () => {
            const response = await request(app)
                .post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: String(productIdWithDeps) });

            expect(response.statusCode).toBe(409); // Conflict
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Не можна видаляти товари, які є в накладних");

            // Перевірка, що товар не видалено
            const product = await Product.findById(productIdWithDeps);
            expect(product).not.toBeNull();
        });

        test('Крок 2: Спроба видалити неіснуючий товар', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .post('/api/product/remove-product')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: nonExistentId });

            expect(response.statusCode).toBe(404); // Not Found
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Товар не знайдено");
        });
    });

    // --- Сценарій: Керування знижками (FR013, FR014) ---
    describe('Сценарій: Керування знижками', () => {
        let productIdDiscount;

        beforeEach(async () => {
            const product = await Product.create({
                name: 'DiscountTest',
                description: 'd',
                price: 200,
                category: 'c',
                images: ['i.jpg'],
                colors: 'disc',
                discount: 15,
                sizes: [{ size: 'M', quantity: 1 }]
            });

            productIdDiscount = product._id;
        });

        test('Крок 1 (FR013): Редагування знижки (успішне)', async () => {
            const response = await request(app)
                .put(`/api/product/discount/edit/${productIdDiscount}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ discount: 50 });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.discount).toBe(50);

            const product = await Product.findById(productIdDiscount);
            expect(product.discount).toBe(50);
        });

        test('Крок 2 (FR013 - Негативний): Редагування знижки (невалідний %)', async () => {
            const response = await request(app)
                .put(`/api/product/discount/edit/${productIdDiscount}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ discount: 110 }); // Більше 100

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Знижка повинна бути від 0 до 100%");
        });

        test('Крок 3 (FR013 - Негативний): Редагування знижки (не число)', async () => {
            const response = await request(app)
                .put(`/api/product/discount/edit/${productIdDiscount}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ discount: "abc" }); // Не число

            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Знижка повинна бути числом");
        });

        test('Крок 4 (FR014): Видалення знижки', async () => {
            const response = await request(app)
                .delete(`/api/product/discount/remove/${productIdDiscount}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.discount).toBe(0);

            const product = await Product.findById(productIdDiscount);
            expect(product.discount).toBe(0);
        });

        test('Крок 5 (FR014 - Негативний): Видалення знижки для неіснуючого товару', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .delete(`/api/product/discount/remove/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Товар не знайдено");
        });
    });

    // --- Сценарій: Перевірка прав доступу для товарів (NFR03) ---
    describe('Сценарій: Перевірка прав доступу (NFR03) - Товари', () => {
        let userToken;
        let regularUserId;
        let testFilePath;

        beforeEach(async () => {
            // Створюємо звичайного користувача
            const userPassword = await hashPassword('SysUserPassProd');
            const regularUser = await User.create({
                firstName: 'ProdUser',
                secondName: 'Client',
                middleName: 'T',
                email: 'produser@test.com',
                phoneNumber: '4444444444',
                password: userPassword,
                role: 'користувач'
            });

            regularUserId = regularUser._id;
            userToken = generateToken(regularUserId, 'користувач');

            // Створюємо тестовий файл
            testFilePath = path.join(__dirname, 'test-files', 'user_cant_add.jpg');
            fs.writeFileSync(testFilePath, 'test image content');
        });

        test('Крок 1: Звичайний користувач НЕ може додавати товар', async () => {
            // Перевіряємо, що файл існує
            expect(fs.existsSync(testFilePath)).toBe(true);

            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${userToken}`) // Токен користувача
                .field('name', 'UserCantAdd')
                .field('description', 'd')
                .field('price', '1')
                .field('category', 'c')
                .field('colors', 'c')
                .field('sizes', JSON.stringify([{ size: 'S', quantity: 1 }]))
                .attach('images', testFilePath);

            expect(response.statusCode).toBe(403); // Forbidden
        });

        test('Крок 2: Звичайний користувач НЕ може видаляти товар', async () => {
            const product = await Product.create({
                name: 'UserCantDelete',
                description: 'd',
                price: 1,
                category: 'c',
                images: ['i.jpg'],
                colors: 'red',
                sizes: [{ size: 'M', quantity: 1 }]
            });

            const response = await request(app)
                .post('/api/product/remove-product')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ id: String(product._id) });

            expect(response.statusCode).toBe(403);
        });

        test('Крок 3: Звичайний користувач НЕ може редагувати товар', async () => {
            const product = await Product.create({
                name: 'UserCantEdit',
                description: 'd',
                price: 1,
                category: 'c',
                images: ['i.jpg'],
                colors: 'red',
                sizes: [{ size: 'M', quantity: 1 }]
            });

            const response = await request(app)
                .post('/api/product/edit-product')
                .set('Authorization', `Bearer ${userToken}`)
                .field('id', String(product._id))
                .field('name', 'UserTriedToEdit');

            expect(response.statusCode).toBe(403);
        });

        test('Крок 4: Звичайний користувач НЕ може редагувати знижку', async () => {
            const product = await Product.create({
                name: 'UserCantEditDiscount',
                description: 'd',
                price: 1,
                category: 'c',
                images: ['i.jpg'],
                colors: 'red',
                sizes: [{ size: 'M', quantity: 1 }]
            });

            const response = await request(app)
                .put(`/api/product/discount/edit/${product._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ discount: 5 });

            expect(response.statusCode).toBe(403);
        });
    });

    // --- Сценарій: Перевірка прав доступу для товарів (NFR03) - Комірник ---
    describe('Сценарій: Перевірка прав доступу (NFR03) - Комірник', () => {
        test('Крок 1: Комірник МОЖЕ додавати товар', async () => {
            const response = await request(app)
                .post('/api/product/add-product')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен КОМІРНИКА
                .field('name', 'KomirnykCanAdd')
                .field('description', 'd').field('price', '1').field('category', 'c').field('colors', 'c').field('sizes', JSON.stringify([{ size: 'S', quantity: 1 }]))
                .attach('images', createTestFile('komirnyk_add.jpg'));
            expect(response.statusCode).toBe(200); // Очікуємо успіх
            expect(response.body.success).toBe(true);
        });

        test('Крок 2: Комірник МОЖЕ видаляти товар', async () => {
            const product = await Product.create({ name: 'KomirnykCanDelete', description: 'Комірник МОЖЕ видаляти товар', price: 1, category: 'c', images: ['i.jpg'], colors: 'red' });
            const response = await request(app)
                .post('/api/product/remove-product')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен Комірника
                .send({ id: String(product._id) });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 3: Комірник МОЖЕ редагувати товар', async () => {
            const product = await Product.create({
                name: 'KomirnykCanEdit',
                description: 'd',
                price: 1,
                category: 'c',
                images: ['i.jpg'],
                colors: 'red',
                sizes: [{ size: 'M', quantity: 1 }] // Додайте розміри, якщо вони обов'язкові
            });

            const response = await request(app)
                .post('/api/product/edit-product')
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен Комірника
                .field('id', String(product._id))
                .field('name', 'KomirnykEdited')
                .field('description', 'Опис товару')
                .field('price', '1')
                .field('category', 'c')
                .field('colors', 'red')
                .field('sizes', JSON.stringify([{ size: 'M', quantity: 1 }])); // Додайте розміри

            console.log(response.body);
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('Крок 4: Комірник МОЖЕ редагувати знижку', async () => {
            const product = await Product.create({ name: 'KomirnykCanEditDiscount', description: 'd', price: 1, category: 'c', images: ['i.jpg'], colors: 'red' });
            const response = await request(app)
                .put(`/api/product/discount/edit/${product._id}`)
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен Комірника
                .send({ discount: 5 });
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });
        test('Крок 5: Комірник МОЖЕ видаляти знижку', async () => {
            const product = await Product.create({ name: 'KomirnykCanRemoveDiscount', description: 'd', price: 1, category: 'c', images: ['i.jpg'], colors: 'red', discount: 10 });
            const response = await request(app)
                .delete(`/api/product/discount/remove/${product._id}`)
                .set('Authorization', `Bearer ${nonAdminToken}`) // Токен Комірника
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
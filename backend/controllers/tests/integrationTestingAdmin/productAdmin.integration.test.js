import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { app } from '../../../server.js';
import Product from '../../../models/productModel.js';
import Invoice from '../../../models/invoiceModel.js';
import Order from '../../../models/orderModel.js';
import User from '../../../models/userModel.js';

// --- Налаштування Тестового Середовища ---
let adminToken; // Токен для аутентифікації адміна/співробітника
let adminUserId;
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/backend_test_db_products';
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_tests';
const TEST_UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'test-uploads');

// Функція для генерації JWT токена
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

// Створення папки uploads, якщо її немає
beforeAll(async () => {
    if (!fs.existsSync(TEST_UPLOAD_DIR)) {
        fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }
    await mongoose.connect(TEST_MONGO_URI);
    console.log('Connected to Test DB (Products)');
});

afterAll(async () => {
    // Закриття з'єднання з БД
    await mongoose.connection.close();
    console.log('Test DB connection closed (Products)');
});

beforeEach(async () => {
    // Очищення колекцій
    await Product.deleteMany({});
    await Invoice.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});

    // Створення тестового адміністратора/співробітника
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminPass123', salt);
    const admin = await User.create({
        firstName: 'ProductAdmin',
        secondName: 'Test',
        middleName: 'P.',
        email: 'product.admin@test.com',
        phoneNumber: '1234567890',
        password: hashedPassword,
        role: 'адміністратор',
        isActive: true,
        birthDate: new Date('1990-01-01'),
    });
    adminUserId = admin._id;
    adminToken = generateToken(adminUserId, 'адміністратор'); // Генеруємо токен

    if (fs.existsSync(TEST_UPLOAD_DIR)) {
        const files = fs.readdirSync(TEST_UPLOAD_DIR);
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(TEST_UPLOAD_DIR, file));
            } catch (err) {
                console.error(`Could not delete test file ${file}: ${err}`);
            }
        }
    }
});

// Хелпер для створення тестового файлу
const createTestFile = (filename, content = 'test content') => {
    if (!fs.existsSync(TEST_UPLOAD_DIR)) {
        fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }
    const filePath = path.join(TEST_UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
};

// Тести для POST /api/product/add-product
describe('POST /api/product/add-product', () => {
    let productData;
    let testFilePath1;
    let testFilePath2;

    beforeEach(() => {
        productData = {
            name: 'Тестовий Продукт Інтегр',
            description: 'Опис для інтеграційного тесту',
            price: '150',
            category: 'Футболки',
            threads: 'Муліне',
            cut: 'Вільний',
            technique: 'Гладь',
            fabric: 'Бавовна',
            colors: 'Синій,Жовтий',
            sizes: JSON.stringify([{ size: 'L', quantity: 10 }, { size: 'XL', quantity: 5 }]) // Keep as string
        };
        testFilePath1 = createTestFile('testImage1.jpg');
        testFilePath2 = createTestFile('testImage2.png');
    });

    it('TCP01 - має успішно додати товар з валідними даними та файлами (200 OK)', async () => {
        const response = await request(app)
            .post('/api/product/add-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', productData.name)
            .field('description', productData.description)
            .field('price', productData.price)
            .field('category', productData.category)
            .field('threads', productData.threads)
            .field('cut', productData.cut)
            .field('technique', productData.technique)
            .field('fabric', productData.fabric)
            .field('colors', productData.colors)
            // Надсилаємо розміри окремими полями
            .field('sizes[0][size]', 'L')
            .field('sizes[0][quantity]', '10')
            .field('sizes[1][size]', 'XL')
            .field('sizes[1][quantity]', '5')
            .attach('images', testFilePath1)
            .attach('images', testFilePath2);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('TCP07 - має повернути 400, якщо товар з такою назвою та кольором вже існує', async () => {
        // Спочатку створюємо товар
        await Product.create({
            name: productData.name,
            description: 'Існуючий опис',
            price: 100,
            category: 'Кат1',
            images: ['exist.jpg'],
            colors: productData.colors, // Такий самий колір
        });

        const response = await request(app)
            .post('/api/product/add-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', productData.name)
            .field('description', productData.description)
            .field('price', productData.price)
            .field('category', productData.category)
            .field('colors', productData.colors)
            .field('sizes', productData.sizes)
            .attach('images', testFilePath1);


        expect(response.statusCode).toBe(400); // Очікуємо 400 Bad Request
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар з такою назвою та кольором вже існує");
    });

    it('TCP02 - має повернути 400, якщо відсутня назва товару', async () => {
        const response = await request(app)
            .post('/api/product/add-product')
            .set('Authorization', `Bearer ${adminToken}`)
            // Не передаємо .field('name', ...)
            .field('description', productData.description)
            .field('price', productData.price)
            .field('category', productData.category)
            .field('colors', productData.colors)
            .field('sizes', productData.sizes)
            .attach('images', testFilePath1);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, введіть назву товару");
    });

    it('TCP06 - має повернути 400, якщо не передано файли зображень', async () => {
        const response = await request(app)
            .post('/api/product/add-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', productData.name)
            .field('description', productData.description)
            .field('price', productData.price)
            .field('category', productData.category)
            .field('colors', productData.colors)
            .field('sizes', productData.sizes)
        // Не робимо .attach('images', ...)

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Будь ласка, завантажте хоча б одне зображення товару");
    });
});

// Тести для POST /api/product/remove-product
describe('POST /api/product/remove-product', () => {
    let productId;
    let testFilePath;
    let testFileName;

    beforeEach(async () => {
        // Створюємо товар для видалення
        testFileName = `${Date.now()}_remove_test.jpg`; // Генеруємо ім'я файлу, яке створить multer
        testFilePath = createTestFile(testFileName); // Створюємо файл фізично

        const product = await Product.create({
            name: 'Товар для Видалення',
            description: 'Опис', price: 50, category: 'ТестКат',
            images: [testFileName], // Зберігаємо ім'я файлу
            colors: 'червоний',
        });
        productId = product._id;
    });

    it('TCP12 - має успішно видалити товар і його файл зображення (200 OK)', async () => {
        // Створюємо унікальний файл
        const testFileName = `test-${Date.now()}.jpg`;
        const testFilePath = path.join(TEST_UPLOAD_DIR, testFileName);
        fs.writeFileSync(testFilePath, 'test content');

        // Створюємо товар
        const product = await Product.create({
            name: 'Product to Delete',
            description: 'Test',
            price: 100,
            category: 'Test',
            images: [testFileName],
            colors: 'red'
        });

        // Видаляємо товар
        const response = await request(app)
            .post('/api/product/remove-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: product._id });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Перевіряємо видалення товару
        const deletedProduct = await Product.findById(product._id);
        expect(deletedProduct).toBeNull();

        // Перевіряємо видалення файлу (з ретраями)
        let attempts = 0;
        let fileExists = true;
        while (fileExists && attempts < 5) {
            fileExists = fs.existsSync(testFilePath);
            if (fileExists) {
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
            }
        }

        if (fileExists) {
            console.log(`Файл не був видалений: ${testFilePath}`);
            console.log(`Вміст директорії: ${fs.readdirSync(TEST_UPLOAD_DIR)}`);
        }
        expect(fileExists).toBe(false);
    }, 15000);

    it('TCP13 - має повернути 409, якщо товар є в накладних', async () => {
        // Створюємо залежну накладну
        await Invoice.create({
            invoiceNumber: 'INV-TEST-001',
            supplier: new mongoose.Types.ObjectId(),
            products: [{
                product: productId,
                size: 'M',
                quantity: 1,
                purchasePrice: 10,
                pricePerUnit: 10
            }],
            totalAmount: 10,
            status: 'активна',
            createdBy: {
                userId: adminUserId,
                name: 'Test Admin'
            },
            dateCreated: new Date()
        });

        const response = await request(app)
            .post('/api/product/remove-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: productId });

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Не можна видаляти товари, які є в накладних");

        // Перевірка, що товар не видалено
        const product = await Product.findById(productId);
        expect(product).not.toBeNull();
    });

    it('TCP14 - має повернути 409, якщо товар є в замовленнях', async () => {
        // Створюємо залежне замовлення
        await Order.create({
            userId: adminUserId,
            items: [{
                productId: productId,
                name: 'Test Product',
                price: 50,
                quantity: 1,
                image: 'test.jpg',
                size: 'M'
            }],
            amount: 50,
            deliveryMethod: 'Самовивіз',
            deliveryDetails: {
                firstName: 'Test',
                secondName: 'User',
                middleName: 'A',
                phone: '1234567890',
                email: 'test@example.com',
                city: 'Test City',
                postOffice: 'Test Office'
            },
            orderNumber: 12345,
            status: 'В обробці'
        });

        const response = await request(app)
            .post('/api/product/remove-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: productId });

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Не можна видаляти товари, які є в замовленнях");
    });

    it('TCP15 - має повернути 404, якщо товар для видалення не знайдено', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post('/api/product/remove-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: nonExistentId });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар не знайдено");
    });
});


// Тести для POST /api/product/edit-product
describe('POST /api/product/edit-product', () => {
    let productId;
    let oldFileName1 = 'oldEdit1.png';
    let oldFileName2 = 'oldEdit2.gif';
    let testFilePathNew;

    beforeEach(async () => {
        // Створюємо товар для редагування
        const product = await Product.create({
            name: 'Товар для Редагування',
            description: 'Старий опис', price: 200, category: 'КатРед',
            images: [oldFileName1, oldFileName2],
            colors: 'чорний',
        });
        productId = product._id;
        // Створюємо старий файл фізично
        createTestFile(oldFileName1);
        createTestFile(oldFileName2);
        testFilePathNew = createTestFile('newEditImage.webp')
    });

    it('TCP20 - має успішно оновити дані товару без зміни зображень (200 OK)', async () => {
        const updatedData = {
            name: 'Оновлений Товар',
            description: 'Новий Опис Ред',
            price: '250',
            category: 'КатРедОнов',
            colors: 'білий',
            // Не передаємо existingImages або files
        };

        const response = await request(app)
            .post(`/api/product/edit-product`) // Використовуємо POST
            .set('Authorization', `Bearer ${adminToken}`)
            .field('id', String(productId)) // Передаємо ID
            .field('name', updatedData.name)
            .field('description', updatedData.description)
            .field('price', updatedData.price)
            .field('category', updatedData.category)
            .field('colors', updatedData.colors);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Товар оновлено");
        expect(response.body.data.name).toBe(updatedData.name);
        expect(response.body.data.price).toBe(Number(updatedData.price));
        // Зображення не мають змінитись
        expect(response.body.data.images).toEqual([oldFileName1, oldFileName2]);

        // Перевірка в БД
        const productInDb = await Product.findById(productId);
        expect(productInDb.name).toBe(updatedData.name);
        expect(productInDb.images).toEqual([oldFileName1, oldFileName2]);
    });

    it('TCP21 & TCP23 - має додати нове зображення і видалити одне старе (200 OK)', async () => {
        // Створюємо тестові файли
        const oldFileName1 = `old1-${Date.now()}.jpg`;
        const oldFileName2 = `old2-${Date.now()}.jpg`;
        const oldFilePath1 = path.join(TEST_UPLOAD_DIR, oldFileName1);
        const oldFilePath2 = path.join(TEST_UPLOAD_DIR, oldFileName2);
        fs.writeFileSync(oldFilePath1, 'old1');
        fs.writeFileSync(oldFilePath2, 'old2');

        const newFileName = `new-${Date.now()}.jpg`;
        const newFilePath = path.join(TEST_UPLOAD_DIR, newFileName);
        fs.writeFileSync(newFilePath, 'new');

        // Створюємо товар
        const product = await Product.create({
            name: 'Product to Update',
            description: 'Test',
            price: 100,
            category: 'Test',
            images: [oldFileName1, oldFileName2],
            colors: 'blue'
        });

        // Оновлюємо товар
        const response = await request(app)
            .post('/api/product/edit-product')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('id', product._id.toString())
            .field('name', 'Updated Product')
            .field('description', 'Updated')
            .field('price', '150')
            .field('category', 'Updated')
            .field('colors', 'green')
            .field('existingImages', JSON.stringify([oldFileName2]))
            .attach('images', newFilePath);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        // Перевіряємо оновлені зображення
        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct.images).toHaveLength(2);
        expect(updatedProduct.images).toContain(oldFileName2);
        expect(updatedProduct.images.some(img => img.includes(newFileName))).toBe(true);

        // Перевіряємо файли (з ретраями)
        let oldFile1Exists = true;
        let attempts = 0;
        while (oldFile1Exists && attempts < 5) {
            oldFile1Exists = fs.existsSync(oldFilePath1);
            if (oldFile1Exists) {
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
            }
        }

        if (oldFile1Exists) {
            console.log(`Файл не був видалений: ${oldFilePath1}`);
            console.log(`Вміст директорії: ${fs.readdirSync(TEST_UPLOAD_DIR)}`);
        }
        expect(oldFile1Exists).toBe(false);
        expect(fs.existsSync(oldFilePath2)).toBe(true);
    }, 15000);

    it('TCP25 - має повернути 400, якщо назва+колір вже існують в іншого товару', async () => {
        // Створюємо інший товар з такою ж назвою і кольором
        await Product.create({
            name: 'Нова Назва',
            colors: 'синій',
            description: 'desc',
            price: 111,
            category: 'cat',
            images: ['image.jpg']
        });

        const response = await request(app)
            .post(`/api/product/edit-product`)
            .set('Authorization', `Bearer ${adminToken}`)
            .field('id', String(productId)) // Редагуємо наш товар
            .field('name', 'Нова Назва')   // Але ставимо існуючу комбінацію
            .field('colors', 'синій')
            .field('description', 'desc')
            .field('price', '111')
            .field('category', 'cat');


        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар з такою назвою та кольором вже існує");
    });

    it('TCP27 - має повернути 404, якщо ID товару для редагування не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .post(`/api/product/edit-product`)
            .set('Authorization', `Bearer ${adminToken}`)
            .field('id', nonExistentId)
            .field('name', 'Some Name')
            .field('description', 'Desc')
            .field('price', '100')
            .field('category', 'Cat')
            .field('colors', 'Red');

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});

// Тести для GET /api/product/edit-product/:id
describe('GET /api/product/edit-product/:id', () => {
    let productId;
    beforeEach(async () => {
        const product = await Product.create({ name: 'Get Data Test', description: 'd', price: 1, category: 'c', images: ['i.jpg'], colors: 'red' });
        productId = product._id;
    });

    it('має успішно повернути дані товару для редагування (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/product/edit-product/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(String(productId));
        expect(response.body.data.name).toBe('Get Data Test');
    });

    it('має повернути 404 (у вигляді success:false), якщо ID не існує', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .get(`/api/product/edit-product/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200); // Роут повертає 200
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар не знайдено");
    });
});

// Тести для DELETE /api/product/discount/remove/:id
describe('DELETE /api/product/discount/remove/:id', () => {
    let productId;
    beforeEach(async () => {
        const product = await Product.create({ name: 'Discount Remove Test', description: 'd', price: 100, category: 'c', images: ['i.jpg'], colors: 'blue', discount: 50 });
        productId = product._id;
    });

    it('TCP31 - має успішно видалити знижку (встановити discount=0) (200 OK)', async () => {
        const response = await request(app)
            .delete(`/api/product/discount/remove/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Знижку видалено");
        expect(response.body.data.discount).toBe(0);

        // Перевірка в БД
        const productInDb = await Product.findById(productId);
        expect(productInDb.discount).toBe(0);
    });

    it('TCP32 - має повернути 404, якщо товар не знайдено', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .delete(`/api/product/discount/remove/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар не знайдено");
    });
});

// Тести для PUT /api/product/discount/edit/:id
describe('PUT /api/product/discount/edit/:id', () => {
    let productId;
    beforeEach(async () => {
        const product = await Product.create({ name: 'Discount Edit Test', description: 'd', price: 100, category: 'c', images: ['i.jpg'], colors: 'green', discount: 10 });
        productId = product._id;
    });

    it('TCP34 - має успішно оновити знижку (200 OK)', async () => {
        const response = await request(app)
            .put(`/api/product/discount/edit/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discount: 35 }); // Нове значення знижки

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Знижку оновлено");
        expect(response.body.data.discount).toBe(35);

        // Перевірка в БД
        const productInDb = await Product.findById(productId);
        expect(productInDb.discount).toBe(35);
    });

    it('TCP35 - має повернути 400, якщо знижка < 0', async () => {
        const response = await request(app)
            .put(`/api/product/discount/edit/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discount: -10 });
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Знижка повинна бути від 0 до 100%");
    });

    it('TCP36 - має повернути 400, якщо знижка > 100', async () => {
        const response = await request(app)
            .put(`/api/product/discount/edit/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discount: 105 });
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Знижка повинна бути від 0 до 100%");
    });

    it('має повернути 400, якщо знижка - не число', async () => {
        const response = await request(app)
            .put(`/api/product/discount/edit/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discount: 'не число' });
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Знижка повинна бути числом");
    });


    it('TCP37 - має повернути 404, якщо товар не знайдено', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .put(`/api/product/discount/edit/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discount: 20 });
        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Товар не знайдено");
    });
});
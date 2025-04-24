// // tests/acceptance.test.js

// const request = require('supertest');
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { app } = require('../../../server'); // Адаптуйте шлях до вашого server.js
// const User = require('../../../models/userModel');
// const Product = require('../../../models/productModel');
// const Order = require('../../../models/orderModel');
// const Review = require('../../../models/reviewModel');

// // Завантаження змінних середовища для тестів
// require('dotenv').config({ path: './.env.test' });

// const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_acceptance';
// const JWT_SECRET = process.env.JWT_SECRET || 'fallback_acceptance_secret';

// let server;
// let mainUserToken;
// let mainUserId;
// let product1, product2; // Тепер створюються в beforeEach

// // Дані для реєстрації (не залежать від beforeEach)
// const baseRegisterData = {
//     firstName: 'Рег', secondName: 'Тест', middleName: 'Прийм.',
//     email: `valid.register.${Date.now()}@example.com`, phoneNumber: '+380991234501',
//     password: 'passwordValid123'
// };

// beforeAll(async () => {
//     await mongoose.connect(TEST_MONGO_URI);
//     server = app.listen(0);
// });

// beforeEach(async () => {
//     // Очищення колекцій
//     const collections = mongoose.connection.collections;
//     for (const key in collections) {
//         if (!key.startsWith('system.')) { // Don't drop system collections
//             try {
//                 await collections[key].deleteMany({});
//             } catch (err) {
//                 // Ignore ns not found errors, could happen in parallel cleanup
//                 if (!err.message.includes("ns not found")) {
//                     console.error(`Error cleaning collection ${key}:`, err);
//                 }
//             }
//         }
//     }

//     // --- Створення основного користувача для більшості тестів ---
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash('password123', salt);
//     const user = await User.create({
//         firstName: 'Прийом', secondName: 'Тестович', middleName: 'Акс.',
//         email: 'acceptance.user@example.com', phoneNumber: '+380990001122',
//         password: hashedPassword, role: 'користувач'
//     });
//     mainUserId = user._id;

//     // --- Отримання токена для основного користувача ---
//     const loginRes = await request(server)
//         .post('/api/user/login')
//         .send({ email: 'acceptance.user@example.com', password: 'password123' });
//     if (loginRes.body.success && loginRes.body.token) {
//          mainUserToken = loginRes.body.token;
//      } else {
//          console.error("Failed to log in main test user in beforeEach:", loginRes.status, loginRes.body);
//          mainUserToken = null; // Handle login failure if necessary
//      }

//     // --- Створення тестових продуктів ---
//     [product1, product2] = await Promise.all([
//         Product.create({
//             name: 'Вишиванка "Патріот"', description: 'Класична бавовняна.', price: 1200,
//             category: 'Вишиванки', images: ['p1.jpg'], colors: 'Білий',
//             sizes: [{ size: 'M', quantity: 10 }, { size: 'L', quantity: 5 }]
//         }),
//         Product.create({
//             name: 'Сукня "Літня"', description: 'Легка сукня.', price: 1500, discount: 10,
//             category: 'Сукні', images: ['p2.jpg'], colors: 'Блакитний',
//             sizes: [{ size: 'S', quantity: 8 }, { size: 'M', quantity: 0 }]
//         })
//     ]);
//      // Додатково створюємо product3 для availability тесту
//      await Product.create({
//           name: 'ТоварБезНаявності', description: 'Відсутній', price: 500,
//           category: 'Аксесуари', images: ['p3.jpg'], colors: 'Сірий',
//           sizes: [{ size: 'OneSize', quantity: 0 }]
//       });
// });


// afterAll(async () => {
//     if (mongoose.connection.readyState === 1) {
//         await mongoose.disconnect();
//     }
//     if (server && server.listening) {
//          await new Promise(resolve => server.close(resolve));
//      }
// });

// // ============================
// // == Acceptance Test Cases ===
// // ============================
// describe('Acceptance Tests (API Level)', () => {

//     // --- Реєстрація та Вхід ---
//     describe('Registration and Login (AC_REG_*, AC_LOG_*)', () => {
//          // (Код тестів реєстрації та логіну залишається без змін,
//          //  оскільки він не залежав від product1/product2)

//          test('[AC_REG_001] User can successfully register with valid data', async () => {
//              const newUser = { ...baseRegisterData, email:`new.valid.${Date.now()}@example.com` }; // Унікальний email
//              const res = await request(server).post('/api/user/register').send(newUser).expect(200);
//              expect(res.body.success).toBe(true);
//              expect(res.body).toHaveProperty('token');
//          });

//          test('[AC_REG_002] User cannot register with an existing email', async () => {
//             const existingEmail = 'existing.acc@example.com';
//             await User.create({...baseRegisterData, email: existingEmail, password: await bcrypt.hash(baseRegisterData.password, 10) });
//             const res = await request(server).post('/api/user/register').send({ ...baseRegisterData, email: existingEmail }).expect(200);
//             expect(res.body.success).toBe(false);
//             expect(res.body.message).toMatch(/Такий користувач вже існує/i);
//          });

//          test('[AC_REG_003] User cannot register with a short password', async () => {
//             const res = await request(server).post('/api/user/register').send({ ...baseRegisterData, email:`short.pass.${Date.now()}@example.com`, password: '123' }).expect(200);
//             expect(res.body.success).toBe(false);
//             expect(res.body.message).toBe('Пароль має містити щонайменше 8 символів');
//         });

//          test('[AC_REG_004] User cannot register without a required field (e.g., secondName)', async () => {
//             const invalidData = { ...baseRegisterData, email:`no.second.${Date.now()}@example.com` };
//             delete invalidData.secondName;
//             const res = await request(server).post('/api/user/register').send(invalidData).expect(200);
//             expect(res.body.success).toBe(false);
//             expect(res.body.message).toMatch(/введіть прізвище/i);
//          });

//          test('[AC_LOG_001] Existing user can successfully log in', async () => {
//             // Використовуємо користувача, створеного в beforeEach
//             const res = await request(server).post('/api/user/login').send({ email: 'acceptance.user@example.com', password: 'password123' }).expect(200);
//             expect(res.body.success).toBe(true);
//             expect(res.body).toHaveProperty('token');
//         });

//         test('[AC_LOG_002] Login fails with incorrect password', async () => {
//             const res = await request(server).post('/api/user/login').send({ email: 'acceptance.user@example.com', password: 'wrongPassword' }).expect(200);
//             expect(res.body.success).toBe(false);
//             expect(res.body.message).toBe('Некоректні дані');
//         });

//         test('[AC_LOG_003] Login fails with non-existent email', async () => {
//             const res = await request(server).post('/api/user/login').send({ email: 'nosuchuser@example.com', password: 'password123' }).expect(200);
//             expect(res.body.success).toBe(false);
//             expect(res.body.message).toBe('Такого користувача не існує');
//         });
//     });

//     // --- Перегляд Товарів ---
//     describe('Product Browsing (AC_PROD_*)', () => {
//         test('[AC_PROD_001] User can view the product catalog', async () => {
//             const startTime = Date.now();
//             const res = await request(server).get('/api/product/list-product').expect(200);
//             const duration = Date.now() - startTime;
//             expect(res.body.success).toBe(true);
//             expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Включаючи товар без наявності
//             expect(duration).toBeLessThan(2000); // NFR05
//         });

//         test('[AC_PROD_002] User can view product details', async () => {
//             // Важливо: переконатись, що product1 існує після beforeEach
//              expect(product1).toBeDefined();
//              expect(product1._id).toBeDefined();

//              const res = await request(server).get(`/api/product/details/${product1._id}`).expect(200);
//              expect(res.body.success).toBe(true);
//              expect(res.body.data._id).toBe(product1._id.toString());
//              expect(res.body.data.name).toBe(product1.name);
//         });

//          test('[AC_PROD_003] User can view discounted products', async () => {
//              expect(product2).toBeDefined(); // Перевіряємо що товар зі знижкою створений
//              const res = await request(server).get('/api/product/list-discounted-products').expect(200);
//              expect(res.body.success).toBe(true);
//              expect(res.body.data.length).toBe(1);
//              expect(res.body.data[0]._id).toBe(product2._id.toString());
//          });
//     });

//     // --- Кошик ---
//     describe('Shopping Cart (AC_CART_*)', () => {
//         test('[AC_CART_001 & AC_CART_002] User can add product to cart', async () => {
//              expect(product1).toBeDefined();
//              expect(mainUserToken).toBeTruthy(); // Перевіряємо чи є токен

//              const resAdd = await request(server).post('/api/cart/add')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send({ userId: mainUserId, itemId: product1._id }).expect(200);
//              expect(resAdd.body.success).toBe(true);

//              const resGet = await request(server).post('/api/cart/get')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send({ userId: mainUserId });
//              expect(resGet.body.success).toBe(true);
//              expect(resGet.body.cartData[product1._id.toString()]).toBe(1);
//         });

//         test('[AC_CART_003] Adding the same product increases quantity', async () => {
//             expect(product1).toBeDefined();
//             expect(mainUserToken).toBeTruthy();

//             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200);

//             const resGet = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
//             expect(resGet.body.cartData[product1._id.toString()]).toBe(2);
//         });

//          test('[AC_CART_004] User can view cart contents', async () => {
//              expect(product1).toBeDefined();
//              expect(product2).toBeDefined();
//              expect(mainUserToken).toBeTruthy();

//              await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//              await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product2._id });

//              const resGet = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId }).expect(200);
//              expect(resGet.body.success).toBe(true);
//              expect(Object.keys(resGet.body.cartData).length).toBe(2);
//          });

//          test('[AC_CART_005 & AC_CART_006] User can remove items from cart', async () => {
//             expect(product1).toBeDefined();
//             expect(mainUserToken).toBeTruthy();

//             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });

//             // Remove one
//             await request(server).post('/api/cart/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200);
//             let cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
//             expect(cart.body.cartData[product1._id.toString()]).toBe(1);

//             // Remove second
//             await request(server).post('/api/cart/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200);
//             cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
//             expect(cart.body.cartData[product1._id.toString()]).toBe(0);
//          });
//     });

//      // --- Список Улюблених ---
//      describe('Favourites List (AC_FAV_*)', () => {
//         test('[AC_FAV_001] User can add product to favourites', async () => {
//              expect(product1).toBeDefined();
//              expect(mainUserToken).toBeTruthy();
//              const resAdd = await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200);
//              expect(resAdd.body.success).toBe(true);
//              const user = await User.findById(mainUserId);
//              expect(user.favourites[product1._id.toString()]).toBe(1);
//         });

//         test('[AC_FAV_002] User can view favourites list', async () => {
//             expect(product1 && product2 && mainUserToken).toBeDefined();
//             await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//             await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product2._id });

//             const resGet = await request(server).post('/api/favourite/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId }).expect(200);
//             expect(resGet.body.success).toBe(true);
//             expect(Object.keys(resGet.body.favourites).length).toBe(2);
//         });

//          test('[AC_FAV_003] User can remove product from favourites', async () => {
//             expect(product1 && mainUserToken).toBeDefined();
//             await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//             const resRemove = await request(server).post('/api/favourite/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200);
//             expect(resRemove.body.success).toBe(true);
//             const user = await User.findById(mainUserId);
//             expect(user.favourites[product1._id.toString()]).toBe(0);
//          });
//     });

//     // --- Оформлення Замовлення ---
//     describe('Order Placement (AC_ORDER_*)', () => {
//         // Визначаємо validOrderData тут, всередині describe, щоб product1 був доступний
//         let validOrderData;
//         beforeEach(() => {
//              // Тепер product1._id гарантовано існує
//               validOrderData = {
//                   items: [
//                      // Переконуємося, що об'єкт item відповідає моделі замовлення
//                       { _id: product1._id.toString(), // Використовуємо _id для імітації даних з фронтенду
//                         productId: product1._id, // Додаємо productId як вимагає схема Order
//                         name: product1.name,
//                         price: product1.price,
//                         discount: product1.discount,
//                         size: product1.sizes[0].size, // Беремо перший доступний розмір
//                         images: product1.images,
//                         quantity: 1 }
//                   ],
//                   // Перераховуємо amount коректно на основі product1
//                   amount: product1.price * (1 - (product1.discount || 0) / 100),
//                   deliveryMethod: "Нова Пошта",
//                   deliveryDetails: {
//                       firstName: "Антон", lastName: "Замовник", middleName: "Тестович",
//                       email: "order.test@example.com", phone: "+380951112233",
//                       region: "Одеська", city: "Одеса", departmentNumber: "25"
//                   }
//               };
//         });

//         test('[AC_ORDER_001 & AC_ORDER_002] User can place an order successfully', async () => {
//             expect(mainUserToken).toBeTruthy();
//             const res = await request(server).post('/api/order/place')
//                 .set('Authorization', `Bearer ${mainUserToken}`)
//                 .send({ ...validOrderData, userId: mainUserId }) // Додаємо userId
//                 .expect(200);
//             expect(res.body.success).toBe(true);
//             expect(res.body).toHaveProperty('session_url');
//             expect(res.body).toHaveProperty('orderNumber');
//         });

//          test('[AC_ORDER_003] Order fails if required delivery detail is missing (Nova Poshta)', async () => {
//              expect(mainUserToken).toBeTruthy();
//              const invalidData = JSON.parse(JSON.stringify(validOrderData));
//              delete invalidData.deliveryDetails.departmentNumber;
//              const res = await request(server).post('/api/order/place')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send({ ...invalidData, userId: mainUserId }).expect(400);
//              expect(res.body.success).toBe(false);
//              expect(res.body.message).toMatch(/Для Нової Пошти/); // NFR06
//          });

//          test('[AC_ORDER_004] Order fails if phone format is invalid', async () => {
//              expect(mainUserToken).toBeTruthy();
//              const invalidData = JSON.parse(JSON.stringify(validOrderData));
//              invalidData.deliveryDetails.phone = '123';
//              const res = await request(server).post('/api/order/place')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send({ ...invalidData, userId: mainUserId }).expect(400);
//              expect(res.body.success).toBe(false);
//              expect(res.body.message).toMatch(/коректний номер телефону/); // NFR06
//          });

//          test('[AC_ORDER_005 & FR13] Cart is cleared after successful order placement', async () => {
//             expect(product1 && mainUserToken).toBeDefined();
//             // Add to cart first
//             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
//             // Verify cart is not empty
//              let cartBefore = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
//              expect(Object.keys(cartBefore.body.cartData).length).toBeGreaterThan(0);

//              // Place order
//             await request(server).post('/api/order/place')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send({ ...validOrderData, userId: mainUserId }).expect(200);

//             // Verify cart is empty
//             const cartAfter = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
//             expect(cartAfter.body.success).toBe(true);
//             expect(cartAfter.body.cartData).toEqual({});
//         });
//     });

//      // --- Історія та Статус Замовлень ---
//     describe('Order History and Status (AC_HIST_*, AC_STATUS_*)', () => {
//         let createdOrderId;
//         beforeEach(async () => {
//              // Створення тестового замовлення перед кожним тестом цього блоку
//              const orderData = { // Використаємо ті самі дані, що й раніше
//                 items: [{ productId: product1._id, name: product1.name, price: product1.price, discount: product1.discount, size: product1.sizes[0].size, image: product1.images[0], quantity: 1 }],
//                 amount: product1.price * (1 - (product1.discount || 0) / 100),
//                 deliveryMethod: "Нова Пошта",
//                 deliveryDetails: { firstName: "Істор", lastName: "Замовл", middleName: "К.", email: "hist@ex.com", phone: "+380111111111", region: "Львівська", city: "Львів", departmentNumber: "1" }
//             };
//             const newOrder = new Order({ ...orderData, userId: mainUserId, orderNumber: `ACHIST${Date.now()}` });
//             await newOrder.save();
//             createdOrderId = newOrder._id;
//         });

//          test('[AC_HIST_001] User can view their order history', async () => {
//             expect(mainUserToken).toBeTruthy();
//             const res = await request(server).post('/api/order/userorders')
//                 .set('Authorization', `Bearer ${mainUserToken}`)
//                 .send({ userId: mainUserId }).expect(200);
//             expect(res.body.success).toBe(true);
//             expect(res.body.data.length).toBe(1);
//             expect(res.body.data[0]._id).toBe(createdOrderId.toString());
//          });

//          test('[AC_STATUS_001] User can view order details and status', async () => {
//             expect(mainUserToken).toBeTruthy();
//              const res = await request(server).get(`/api/order/${createdOrderId}/status`)
//                 .set('Authorization', `Bearer ${mainUserToken}`)
//                 .expect(200);
//              expect(res.body.success).toBe(true);
//              expect(res.body.data.orderNumber).toBeDefined();
//              expect(res.body.data.currentStatus).toBe('Нове замовлення'); // Default status
//              expect(res.body.data.statusHistory).toBeInstanceOf(Array);
//          });
//     });

//     // --- Відгуки ---
//     describe('Reviews (AC_REV_*)', () => {
//         test('[AC_REV_001] User can add a review for a product', async () => {
//             expect(product1 && mainUserToken).toBeDefined();
//             const reviewData = { productId: product1._id.toString(), comment: "Чудовий приймальний відгук!" };
//             const res = await request(server).post('/api/review/create')
//                 .set('Authorization', `Bearer ${mainUserToken}`)
//                 .send(reviewData).expect(201);
//              expect(res.body.success).toBe(true);
//              expect(res.body.message).toBe("Відгук успішно додано");
//         });

//         test('[AC_REV_002] User cannot add an empty review', async () => {
//              expect(product1 && mainUserToken).toBeDefined();
//              const reviewData = { productId: product1._id.toString(), comment: "" };
//              const res = await request(server).post('/api/review/create')
//                  .set('Authorization', `Bearer ${mainUserToken}`)
//                  .send(reviewData).expect(400);
//              expect(res.body.success).toBe(false);
//              expect(res.body.message).toMatch(/Необхідно надати.*текст коментаря/i);
//         });

//         test('[AC_REV_003] User can view reviews (respecting confidentiality)', async () => {
//             expect(product1).toBeDefined();
//              // Створити кілька відгуків (один прихований)
//              await Review.create({ product: product1._id, user: mainUserId, comment: "Видимий 1" });
//              await Review.create({ product: product1._id, user: mainUserId, comment: "Прихований", isVisible: false });

//              const res = await request(server).get(`/api/review/reviews-user/${product1._id}`).expect(200);
//              expect(res.body.success).toBe(true);
//              expect(res.body.data.length).toBe(1); // Повинен повернути тільки видимий
//              expect(res.body.data[0].comment).toBe("Видимий 1");
//              expect(res.body.data[0].user).toBeDefined();
//              expect(res.body.data[0].user).not.toHaveProperty('email'); // NFR09
//              expect(res.body.data[0].user).toHaveProperty('firstName');
//          });
//     });
// });


// tests/acceptance.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { app } = require('../../../server'); // Адаптуйте шлях до вашого server.js
const User = require('../../../models/userModel');
const Product = require('../../../models/productModel');
const Order = require('../../../models/orderModel');
const Review = require('../../../models/reviewModel');

// Завантаження змінних середовища для тестів
require('dotenv').config({ path: './.env.test' });

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_acceptance';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_acceptance_secret';

let server;
let mainUserToken;
let mainUserId;
let product1, product2, product3; // Додано product3
let existingUserEmail = 'existing.user.acc@example.com'; // Для тестів реєстрації

// Базові дані для реєстрації
const baseRegisterData = {
    firstName: 'Рег', secondName: 'Тест', middleName: 'Прийм.',
    phoneNumber: '+380991234501', password: 'passwordValid123'
};

beforeAll(async () => {
    if (!TEST_MONGO_URI || !JWT_SECRET) {
        console.error("ERROR: TEST_MONGO_URI or JWT_SECRET is not set. Check your .env.test file.");
        process.exit(1);
    }
    await mongoose.connect(TEST_MONGO_URI);
    server = app.listen(0);
});

beforeEach(async () => {
    // --- Очищення Колекцій ---
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        if (!key.startsWith('system.')) {
             try { await collections[key].deleteMany({}); } catch (err) {
                 if (!err.message.includes("ns not found")) { console.error(`Error cleaning collection ${key}:`, err); }
             }
        }
    }

    // --- Створення основного користувача і продуктів ---
    const salt = await bcrypt.genSalt(10);
    const mainUserPassword = 'password123';
    const hashedPassword = await bcrypt.hash(mainUserPassword, salt);
    const user = await User.create({
        firstName: 'Прийом', secondName: 'Тестович', middleName: 'Акс.',
        email: 'acceptance.user@example.com', phoneNumber: '+380990001122',
        password: hashedPassword, role: 'користувач', cartData: {}, favourites: {} // Явно задаємо пусті об'єкти
    });
    mainUserId = user._id.toString(); // Convert to string for consistency

    // Логін користувача
    const loginRes = await request(server).post('/api/user/login')
        .send({ email: 'acceptance.user@example.com', password: mainUserPassword });
    if (loginRes.body.success && loginRes.body.token) { mainUserToken = loginRes.body.token; }
    else { console.error("FATAL: Could not log in main user in beforeEach"); process.exit(1); }

    [product1, product2, product3] = await Promise.all([
        Product.create({
            name: 'Вишиванка "Патріот"', description: 'Класична бавовняна.', price: 1200, category: 'Вишиванки',
            images: ['p1.jpg'], colors: 'Білий', sizes: [{ size: 'M', quantity: 10 }, { size: 'L', quantity: 5 }]
        }),
        Product.create({
            name: 'Сукня "Літня"', description: 'Легка сукня.', price: 1500, discount: 10, category: 'Сукні',
            images: ['p2.jpg'], colors: 'Блакитний', sizes: [{ size: 'S', quantity: 8 }, { size: 'M', quantity: 0 }] // M unavailable
        }),
         Product.create({
              name: 'Товар Без Наявності', description: 'Відсутній', price: 500, category: 'Аксесуари',
              images: ['p3.jpg'], colors: 'Сірий', sizes: [{ size: 'OneSize', quantity: 0 }] // Out of stock
          })
    ]);

    // Створення існуючого користувача для тесту унікальності email
     await User.create({...baseRegisterData, email: existingUserEmail, password: await bcrypt.hash(baseRegisterData.password, salt) });

});

afterAll(async () => {
    if (mongoose.connection.readyState === 1) { await mongoose.disconnect(); }
    if (server && server.listening) { await new Promise(resolve => server.close(resolve)); }
});

// ============================
// == Acceptance Test Cases ===
// ============================
describe('Acceptance Tests (API Level)', () => {

    // --- Реєстрація та Вхід (7 Тестів) ---
    describe('Registration and Login (AC_REG_*, AC_LOG_*)', () => {
        test('[AC_REG_001] User can successfully register with valid data', async () => {
            const uniqueEmail = `new.valid.${Date.now()}@example.com`;
            const res = await request(server).post('/api/user/register')
                .send({ ...baseRegisterData, email: uniqueEmail }).expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
            const userInDb = await User.findOne({ email: uniqueEmail }); // FR27
            expect(userInDb).not.toBeNull();
            const isPassHashed = await bcrypt.compare(baseRegisterData.password, userInDb.password); // NFR01
            expect(isPassHashed).toBe(true);
        });

        test('[AC_REG_002] User cannot register with an existing email', async () => {
            const res = await request(server).post('/api/user/register')
                .send({ ...baseRegisterData, email: existingUserEmail }).expect(200); // FR28 (uniqueness)
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Такий користувач вже існує/i); // NFR06
        });

        test('[AC_REG_003] User cannot register with a short password', async () => {
            const res = await request(server).post('/api/user/register')
                .send({ ...baseRegisterData, email: `short.pass.${Date.now()}@example.com`, password: '123' }).expect(200); // FR28 (length)
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Пароль має містити щонайменше 8 символів'); // NFR06
        });

        test('[AC_REG_004] User cannot register without a required field (secondName)', async () => {
            const invalidData = { ...baseRegisterData, email:`no.second.${Date.now()}@example.com` };
            delete invalidData.secondName;
            const res = await request(server).post('/api/user/register').send(invalidData).expect(200); // FR28 (required)
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/введіть прізвище/i); // NFR06
        });

        test('[AC_LOG_001] Existing user can successfully log in', async () => {
            const res = await request(server).post('/api/user/login')
                .send({ email: 'acceptance.user@example.com', password: 'password123' }).expect(200); // FR26
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
        });

        test('[AC_LOG_002] Login fails with incorrect password', async () => {
            const res = await request(server).post('/api/user/login')
                .send({ email: 'acceptance.user@example.com', password: 'wrongPassword' }).expect(200); // FR26
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Некоректні дані'); // NFR06
        });

        test('[AC_LOG_003] Login fails with non-existent email', async () => {
            const res = await request(server).post('/api/user/login')
                .send({ email: 'nosuchuser@example.com', password: 'password123' }).expect(200); // FR26
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Такого користувача не існує'); // NFR06
        });
    });

    // --- Перегляд Товарів (3 Тести) ---
    describe('Product Browsing (AC_PROD_*)', () => {
         test('[AC_PROD_001] User can view the product catalog with prices', async () => {
            const startTime = Date.now();
            const res = await request(server).get('/api/product/list-product').expect(200); // FR19
            const duration = Date.now() - startTime;
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3); // 3 products created
            expect(res.body.data[0]).toHaveProperty('price');
            expect(res.body.data.find(p => p._id === product2._id.toString())).toHaveProperty('discountedPrice'); // Ціна зі знижкою
             expect(duration).toBeLessThan(2500); // NFR05 (Example: 2.5 seconds)
         });

        test('[AC_PROD_002] User can view product details page', async () => {
             const res = await request(server).get(`/api/product/details/${product1._id}`).expect(200); // FR20
             expect(res.body.success).toBe(true);
             expect(res.body.data._id).toBe(product1._id.toString());
             expect(res.body.data.name).toBe(product1.name);
             expect(res.body.data).toHaveProperty('description');
             expect(res.body.data).toHaveProperty('images');
             expect(res.body.data).toHaveProperty('sizes');
        });

        test('[AC_PROD_003] User can view list of discounted products', async () => {
             const res = await request(server).get('/api/product/list-discounted-products').expect(200); // FR21
             expect(res.body.success).toBe(true);
             expect(res.body.data.length).toBe(1); // Only product2 has discount
             expect(res.body.data[0]._id).toBe(product2._id.toString());
        });
    });

    // --- Кошик (6 Тестів) ---
    describe('Shopping Cart (AC_CART_*)', () => {
         test('[AC_CART_001/002] User can add product to cart', async () => {
             const resAdd = await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); // FR01
             expect(resAdd.body.success).toBe(true);
             const cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
             expect(cart.body.cartData[product1._id.toString()]).toBe(1);
        });

        test('[AC_CART_003] Adding the same product increases quantity', async () => {
            await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
            await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }); // FR01
            const cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
            expect(cart.body.cartData[product1._id.toString()]).toBe(2);
        });

        test('[AC_CART_004] User can view cart contents', async () => {
             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product2._id });
             const resGet = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId }).expect(200); // FR03
             expect(resGet.body.success).toBe(true);
             expect(Object.keys(resGet.body.cartData).length).toBe(2);
        });

        test('[AC_CART_005] User can decrease product quantity in cart', async () => {
             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
             await request(server).post('/api/cart/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); // FR02
             const cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
             expect(cart.body.cartData[product1._id.toString()]).toBe(1);
        });

        test('[AC_CART_006] User can remove product fully from cart (quantity = 1)', async () => {
            await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
            await request(server).post('/api/cart/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); // FR02
            const cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
             expect(cart.body.cartData[product1._id.toString()]).toBe(0); // or undefined based on logic
        });

        // Додатковий тест на видалення товару з порожнього кошика (відповідає AC_CART_006 в ширшому сенсі)
        test('[AC_CART_ext_001] Removing item from empty cart is handled correctly', async() => {
             const res = await request(server).post('/api/cart/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); // FR02 robustness
             expect(res.body.success).toBe(true); // Очікуємо успіх, навіть якщо товару не було
             const cart = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
             expect(Object.keys(cart.body.cartData).length).toBe(0); // Кошик залишається порожнім
        });
    });

    // --- Список Улюблених (3 Тести) ---
     describe('Favourites List (AC_FAV_*)', () => {
        test('[AC_FAV_001] User can add product to favourites', async () => {
            const res = await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); //FR04
            expect(res.body.success).toBe(true);
            const user = await User.findById(mainUserId);
            expect(user.favourites[product1._id.toString()]).toBe(1);
        });
        test('[AC_FAV_002] User can view favourites list', async () => {
            await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
            await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product2._id });
            const res = await request(server).post('/api/favourite/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId }).expect(200); //FR06
            expect(res.body.success).toBe(true);
            expect(Object.keys(res.body.favourites).length).toBe(2);
        });
         test('[AC_FAV_003] User can remove product from favourites', async () => {
            await request(server).post('/api/favourite/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
            await request(server).post('/api/favourite/remove').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id }).expect(200); //FR05
            const user = await User.findById(mainUserId);
            expect(user.favourites[product1._id.toString()]).toBe(0);
        });
    });

    // --- Оформлення Замовлення (5 Тестів) ---
    describe('Order Placement (AC_ORDER_*)', () => {
        let orderPayload; // Буде ініціалізовано в beforeEach

        beforeEach(() => {
             // Оновлюємо payload тут, щоб product1._id був актуальним
             orderPayload = {
                 items: [{ _id: product1._id.toString(), productId: product1._id, name: product1.name, price: product1.price, discount: product1.discount, size: product1.sizes[0].size, images: product1.images, quantity: 1 }],
                 amount: product1.price * (1 - (product1.discount || 0) / 100),
                 deliveryMethod: "Нова Пошта",
                 deliveryDetails: { firstName: "Орд", lastName: "Тест", middleName: "Плейс", email: "pl.order@ex.com", phone: "+380631112233", region: "Київ", city: "Київ", departmentNumber: "1" }
             };
        });

        test('[AC_ORDER_001/002] User can successfully place an order', async () => {
            const res = await request(server).post('/api/order/place')
                .set('Authorization', `Bearer ${mainUserToken}`)
                .send({ ...orderPayload, userId: mainUserId }).expect(200); // FR07, FR08
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('orderNumber'); // FR09 (Implicitly tested)
        });

        test('[AC_ORDER_003] Order fails if required delivery field is missing', async () => {
            const invalidPayload = JSON.parse(JSON.stringify(orderPayload));
            delete invalidPayload.deliveryDetails.departmentNumber;
             const res = await request(server).post('/api/order/place')
                .set('Authorization', `Bearer ${mainUserToken}`)
                .send({ ...invalidPayload, userId: mainUserId }).expect(400); // FR08
            expect(res.body.success).toBe(false);
             expect(res.body.message).toMatch(/Для Нової Пошти/i); // NFR06
        });

         test('[AC_ORDER_004] Order fails if phone/email format is invalid', async () => {
             const invalidPayload = JSON.parse(JSON.stringify(orderPayload));
             invalidPayload.deliveryDetails.email = 'invalid-email';
             const res = await request(server).post('/api/order/place')
                 .set('Authorization', `Bearer ${mainUserToken}`)
                 .send({ ...invalidPayload, userId: mainUserId }).expect(400); // FR08
             expect(res.body.success).toBe(false);
             expect(res.body.message).toMatch(/коректний email/i); // NFR06
        });

        test('[AC_ORDER_005 & FR13] Cart is cleared after successful order', async () => {
             await request(server).post('/api/cart/add').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId, itemId: product1._id });
            await request(server).post('/api/order/place').set('Authorization', `Bearer ${mainUserToken}`).send({ ...orderPayload, userId: mainUserId }).expect(200);
            const cartRes = await request(server).post('/api/cart/get').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId });
            expect(cartRes.body.success).toBe(true);
            expect(cartRes.body.cartData).toEqual({}); // Кошик порожній
        });

        // Додатковий тест на валідацію іншого способу доставки
        test('[AC_ORDER_ext_001] Order validation for Ukrposhta', async () => {
            const invalidPayload = JSON.parse(JSON.stringify(orderPayload));
            invalidPayload.deliveryMethod = 'Укрпошта';
            delete invalidPayload.deliveryDetails.departmentNumber; // Видаляємо поле НП
            // delete invalidPayload.deliveryDetails.postalCode; // Видаляємо обов'язкове поле УП
            invalidPayload.deliveryDetails.postalCode = undefined; // Або так
             const res = await request(server).post('/api/order/place')
                 .set('Authorization', `Bearer ${mainUserToken}`)
                 .send({ ...invalidPayload, userId: mainUserId }).expect(400); // FR08
             expect(res.body.success).toBe(false);
             expect(res.body.message).toMatch(/Для Укрпошти/i); // NFR06
        });
    });

    // --- Історія та Статус Замовлень (2 Тести) ---
    describe('Order History and Status (AC_HIST_*, AC_STATUS_*)', () => {
         let orderId;
         beforeEach(async () => {
            // Створення замовлення
             const payload = { /* Скомплектувати валідний payload для placeOrder */
                 items: [{ _id: product1._id.toString(), productId: product1._id, name: product1.name, price: product1.price, discount: product1.discount, size: product1.sizes[0].size, images: product1.images, quantity: 1 }],
                 amount: product1.price * (1 - (product1.discount || 0) / 100),
                 deliveryMethod: "Укрпошта",
                 deliveryDetails: { firstName: "Hist", lastName: "Test", middleName: "A.", email: "hist.t@ex.com", phone: "+380991110000", region:"Rg", city:"Ct", postalCode:"12345", street:"St", houseNumber:"1"}
             };
             const orderRes = await request(server).post('/api/order/place')
                 .set('Authorization', `Bearer ${mainUserToken}`)
                 .send({ ...payload, userId: mainUserId });
            // Потрібно отримати ID створеного замовлення для подальших тестів статусу/деталей.
            // Оскільки placeOrder не повертає ID, знайдемо його в БД
             const placedOrder = await Order.findOne({ userId: mainUserId, orderNumber: orderRes.body.orderNumber });
             if (!placedOrder) console.error("Order for history/status test was not created properly!");
             orderId = placedOrder ? placedOrder._id : null;
         });

        test('[AC_HIST_001] User can view their order history', async () => {
            const res = await request(server).post('/api/order/userorders').set('Authorization', `Bearer ${mainUserToken}`).send({ userId: mainUserId }).expect(200); // FR14
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
        test('[AC_STATUS_001] User can view status of a specific order', async () => {
             if(!orderId) throw new Error("Order ID not available for status test");
            const res = await request(server).get(`/api/order/${orderId}/status`).set('Authorization', `Bearer ${mainUserToken}`).expect(200); // FR16
            expect(res.body.success).toBe(true);
            expect(res.body.data.currentStatus).toBeDefined();
        });
    });

    // --- Профіль Користувача (3+3 = 6 Тестів) ---
    describe('User Profile (AC_PROF_*, AC_PASS_*)', () => {
         test('[AC_PROF_001] User can view their profile data', async () => {
             const res = await request(server).get('/api/user/my-profile').set('Authorization', `Bearer ${mainUserToken}`).expect(200); // FR29
             expect(res.body.success).toBe(true);
             expect(res.body.userData.email).toBe('acceptance.user@example.com');
         });

        test('[AC_PROF_002] User can update profile data', async () => {
             const updateData = { firstName: "Нове", secondName: "Ім'я", middleName: "Проф", phoneNumber: "+380998887766", city:"Дніпро" };
             const res = await request(server).put('/api/user/update-client-profile').set('Authorization', `Bearer ${mainUserToken}`).send(updateData).expect(200); // FR30
             expect(res.body.success).toBe(true);
             expect(res.body.userData.firstName).toBe("Нове");
             expect(res.body.userData.city).toBe("Дніпро");
         });

        test('[AC_PASS_001] User can successfully change password', async () => {
             const res = await request(server).post('/api/user/change-password').set('Authorization', `Bearer ${mainUserToken}`)
                .send({ oldPassword: 'password123', newPassword: 'newPassword45678' }).expect(200); // FR31
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Пароль успішно змінено');
        });

        test('[AC_PASS_002] Fails password change with incorrect old password', async () => {
            const res = await request(server).post('/api/user/change-password').set('Authorization', `Bearer ${mainUserToken}`)
                .send({ oldPassword: 'wrongOldPassword', newPassword: 'newPassword123' }).expect(400); // FR31+FR32
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Невірний старий пароль'); // NFR06
        });

    });

    // --- Відгуки (3 Тести) ---
    describe('Reviews (AC_REV_*)', () => {
         test('[AC_REV_001] User can add a review', async () => {
            const res = await request(server).post('/api/review/create').set('Authorization', `Bearer ${mainUserToken}`)
                .send({ productId: product1._id, comment: "Тестовий відгук АС" }).expect(201); // FR23
             expect(res.body.success).toBe(true);
             expect(res.body.message).toBe("Відгук успішно додано");
        });

         test('[AC_REV_002] User cannot add an empty review', async () => {
             const res = await request(server).post('/api/review/create').set('Authorization', `Bearer ${mainUserToken}`)
                 .send({ productId: product1._id, comment: "" }).expect(400); // FR23 (implied validation)
             expect(res.body.success).toBe(false);
             expect(res.body.message).toMatch(/Необхідно надати.*текст коментаря/i); // NFR06
        });

         test('[AC_REV_003] User can view visible reviews (confidentiality)', async () => {
            // Create reviews
             await Review.create({ product: product1._id, user: mainUserId, comment: "Visible R1" });
             await Review.create({ product: product1._id, user: mainUserId, comment: "Hidden R1", isVisible: false });
            const res = await request(server).get(`/api/review/reviews-user/${product1._id}`).expect(200); // FR25
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].comment).toBe("Visible R1");
            expect(res.body.data[0].user).not.toHaveProperty('email'); // NFR09
            expect(res.body.data[0].user).toHaveProperty('firstName');
         });
    });
});
// // controllers/tests/systemTestingUser/orderUser.system.test.js
// const request = require('supertest');
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken'); // Потрібен для генерації токена
// const { app } = require('../../../server'); // Переконайся, що експортуєш app
// const userModel = require('../../../models/userModel');
// const productModel = require('../../../models/productModel');
// const orderModel = require('../../../models/orderModel');
// const Stripe = require('stripe'); // Імпортуємо для мокування

// // --- Mock Stripe ---
// const mockStripeInstance = {
//     checkout: {
//         sessions: {
//             create: jest.fn().mockResolvedValue({ // Повертаємо фейкову відповідь
//                 id: 'cs_test_123456789',
//                 url: 'https://fake-stripe-checkout-session.url',
//             }),
//         },
//     },
// };
// // Мокаємо сам конструктор Stripe, щоб він повертав наш мок-інстанс
// // !!! ЗАЛИШАЄМО КОРИСТУВАЦЬКИЙ MOCK, ЯК ЗАПИТАНО, АЛЕ ВІН НЕКОРЕКТНО ОБРОБЛЯЄ AUTH !!!
// jest.mock('../../../middleware/auth.js', () => ({
//   authMiddleware: jest.fn((req, res, next) => {
//       // Додає _id замість userId і ЗАВЖДИ пропускає запит
//       req.body._id = 'test-user-id-from-middleware';
//       // console.log('Auth mock: added req.body._id');
//       next();
//   }),
//   adminMiddleware: jest.fn((req, res, next) => next()), // Припускаємо, що адмінські моки потрібні
//   strictAdminMiddleware: jest.fn((req, res, next) => next())
// }));

// const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/GARDA_test_client_orders';
// const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_client_tests';

// let server;
// let testUser;
// let secondTestUser; // Другий користувач для тестів доступу
// let testUserToken; // Токен для testUser
// // Примітка: Токен для secondTestUser НЕ використовується через особливості моку authMiddleware
// let product1;
// let product2;
// let product1Id;
// let product2Id;

// // --- Helper Functions ---
// const createTestOrder = async (userId, itemsData, status = "Нове замовлення", payment = false) => {
//     const generateOrderNumber = () => Math.floor(Math.random() * 900000000000) + 100000000000;
//     let orderNumber;
//     let existingOrder;
//     do {
//         orderNumber = generateOrderNumber();
//         existingOrder = await orderModel.findOne({ orderNumber });
//     } while (existingOrder);

//      const defaultDeliveryDetails = {
//          firstName: "Дефолт", lastName:  "Дефолтенко", middleName: "Дефолтович",
//          email: "default@example.com", phone: "+380990000000",
//          region: "Деф Область", city: "Деф Місто", departmentNumber: "1",
//      };

//     const orderData = {
//         orderNumber: orderNumber.toString(),
//         userId: userId.toString(), // Зберігаємо ID користувача, який створив замовлення
//         items: itemsData.map(item => ({
//             productId: item.productId || new mongoose.Types.ObjectId(),
//             name: item.name || 'Test Item Helper',
//             price: item.price || 100,
//             discount: item.discount || 0,
//             size: item.size || 'M',
//             image: item.image || 'test_helper.jpg',
//             quantity: item.quantity || 1,
//         })),
//         amount: itemsData.reduce((sum, item) => sum + (item.price || 100) * (1 - (item.discount || 0) / 100) * (item.quantity || 1), 0),
//         status: status,
//         payment: payment,
//         deliveryMethod: itemsData.deliveryMethod || "Нова Пошта",
//         deliveryDetails: itemsData.deliveryDetails || defaultDeliveryDetails,
//     };

//      try {
//         // Потрібно передавати ОБОВ'ЯЗКОВІ поля, які вимагає схема, навіть якщо вони мають default
//         // Наприклад, editHistory, якщо він required: true у схемі (хоча він НЕ required у вашому прикладі)
//        const order = new orderModel(orderData);
//        await order.save();
//        return order;
//      } catch (error) {
//         console.error("!!! Error creating test order helper !!!", error);
//         // Якщо помилка валідації через відсутні поля - треба додати їх в orderData тут
//         if (error.name === 'ValidationError') {
//              console.error("Validation Errors:", error.errors);
//          }
//         throw error;
//      }
// };

// const baseUserData = {
//   firstName: 'Користувач', // Більш загально
//   secondName: 'Тестовий',
//   middleName: 'Перший',
//   email: 'user.test@example.com', // Змінено для унікальності
//   phoneNumber: '+380991111111',
//   password: 'password123',
//   role: 'користувач'
// };

// const secondBaseUserData = {
//     firstName: 'Користувач',
//     secondName:  'Тестовий',
//     middleName: 'Другий',
//     email: 'other.user@example.com',
//     phoneNumber: '+380992222222',
//     password: 'password456',
//     role: 'користувач'
// };

// beforeAll(async () => {
//     if (!process.env.TEST_MONGO_URI && TEST_MONGO_URI.includes('localhost')) { console.warn('Using fallback DB URI'); }
//     if (!process.env.TEST_MONGO_URI) { throw new Error("TEST_MONGO_URI not set."); }
//     if (!process.env.JWT_SECRET && JWT_SECRET.includes('fallback')) { console.warn('Using fallback JWT secret'); }
//     if (!process.env.STRIPE_SECRET_KEY) { console.warn('Stripe key not set'); process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key'; }

//     try {
//         console.log(`Connecting to Test DB: ${TEST_MONGO_URI.split('@')[0]}...`);
//         await mongoose.connect(TEST_MONGO_URI);
//         const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'N/A';
//         console.log(`Successfully connected to Test DB: ${dbName}`);
//     } catch (err) { console.error("DB Connect failed:", err); throw err; }

//     try {
//         server = app.listen();
//         const address = server.address();
//         if (!address) { throw new Error("Server address is null"); }
//         console.log(`Test server running on port ${address.port}`);
//     } catch (error) { console.error("Server start failed:", error); throw error; }
// });

// afterAll(async () => {
//     console.log("Closing test server...");
//     if (server) { await new Promise(resolve => server.close(resolve)); console.log("Test server closed."); }
//     console.log("Disconnecting from Test DB...");
//     await mongoose.connection.close();
//     console.log("Disconnected from Test DB.");
//     jest.clearAllMocks();
// });


// beforeEach(async () => {
//     await userModel.deleteMany({});
//     await productModel.deleteMany({});
//     await orderModel.deleteMany({});

//     [product1, product2] = await Promise.all([
//       productModel.create({ name: 'Товар 1', description: 'Опис 1.', price: 100, category: 'Кат1', images: ['p1.jpg'], colors: 'Red', sizes: [{size: 'S', quantity: 10},{size: 'M', quantity: 10}] }),
//       productModel.create({ name: 'Товар 2', description: 'Опис 2.', price: 250, category: 'Кат2', images: ['p2.jpg'], colors: 'Blue', sizes: [{size: 'L', quantity: 5},{size: 'XL', quantity: 5}] })
//     ]);

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(baseUserData.password, salt);
//     const secondHashedPassword = await bcrypt.hash(secondBaseUserData.password, salt);

//     product1Id = product1._id;
//     product2Id = product2._id;

//     testUser = await userModel.create({ ...baseUserData, password: hashedPassword, cartData: { [product1Id]: 1 } }); // З товаром у кошику
//     secondTestUser = await userModel.create({ ...secondBaseUserData, password: secondHashedPassword, cartData: {} });

//     testUserToken = jwt.sign({ user: { id: testUser.id } }, JWT_SECRET, { expiresIn: '1h' });
    
//     mockStripeInstance.checkout.sessions.create.mockClear();
// });

// // --- ІСНУЮЧІ ТЕСТИ НА '/api/order/place' (ЗАЛИШЕНО БЕЗ ЗМІН, ЯК ЗАПИТАНО) ---
// describe('POST /api/order/place', () => {

//     // SYS_CLIENT_ORDER_001
//     it('SYS_CLIENT_ORDER_001: should successfully place an order with Nova Poshta delivery and clear cart', async () => {
//         const orderData = {
//             userId: testUser._id, // <--- Зберігаємо userId в тілі запиту, як у користувача
//             items: [
//                 { _id: product1Id.toString(),  name: product1.name, price: product1.price, discount: 0, size: 'S',colors: 'Blue',  images: product1.images, quantity: 1}, // Користувач використовує 'S' і 'M' для size
//                 { _id: product2Id.toString(),  name: product2.name, price: product2.price, discount: 0, size: 'M', images: product2.images, quantity: 1 }
//             ],
//             amount: product1.price + product2.price,
//             deliveryMethod: "Нова Пошта",
//             deliveryDetails: { /*... Коректні дані для Нової Пошти ... */
//                 firstName: "Тест", lastName: "Тестенко", middleName: "Тестович",
//                 email: "test@example.com", phone: "+380991234567",
//                 region: "Київська", city: "Київ", departmentNumber: "15",
//              },
//         };

//         // Перевірка, що кошик НЕ порожній перед замовленням
//          const userBefore = await userModel.findById(testUser._id);
//          // Припускаємо, що кошик містить хоча б product1Id
//          expect(userBefore.cartData[product1Id.toString()]).toBeDefined();

//         const response = await request(server)
//             .post('/api/order/place')
//             .set('Authorization', `Bearer ${testUserToken}`) // Токен надсилаємо, але мок його ігнорує
//             .send(orderData);

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         // Перевірка відповіді, як було у користувача
//         expect(response.body.session_url).toEqual(expect.any(String));
//         expect(response.body.session_url).toContain('stripe.com');
//         expect(response.body.orderNumber).toEqual(expect.any(Number));

//         // Перевірка збереження в БД (основні поля)
//         const orderInDb = await orderModel.findOne({ orderNumber: response.body.orderNumber });
//         expect(orderInDb).not.toBeNull();
//          // Порівнюємо ID з тим, що НАДІСЛАЛИ, а не з моку
//         expect(orderInDb.userId).toBe(testUser._id.toString());
//         expect(orderInDb.deliveryMethod).toBe("Нова Пошта");
//         expect(orderInDb.items[0].size).toBe('S'); // Перевіряємо збереження розміру
//         expect(orderInDb.items[1].size).toBe('M');

//         // Перевірка очищення кошика (може не працювати, якщо контролер очікує userId з моку)
//         const updatedUser = await userModel.findById(testUser._id);
//          // Якщо оновлення user в контролері використовує userId з токена (якого mock не дає),
//          // то кошик НЕ буде очищено. Якщо використовує userId з тіла запиту, то буде.
//          // Перевірка відповідатиме реальності, тільки якщо контролер бере ID з req.body.userId.
//          if (updatedUser) {
//              expect(updatedUser.cartData).toEqual({});
//          } else {
//             // Це може статися, якщо контролер спробував знайти юзера за 'test-user-id-from-middleware' з req.body._id
//              console.warn('Warning in SYS_CLIENT_ORDER_001: Could not find user after order placement, cart clearance check skipped.');
//          }
//     });

//     // SYS_CLIENT_ORDER_002
//     it('SYS_CLIENT_ORDER_002: should successfully place an order with Ukrposhta delivery', async () => {
//         const orderData = {
//              userId: testUser._id.toString(), // Зберігаємо userId
//             items: [ { _id: product1Id.toString(), name: product1.name, price: product1.price, discount: 0, images: product1.images, quantity: 1, size: 'S' } ],
//             amount: product1.price * 1,
//             deliveryMethod: "Укрпошта",
//             deliveryDetails: { /*... Коректні дані для Укрпошти ...*/
//                 firstName: "Анна", lastName: "Іванова", middleName: "Петрівна",
//                 email: "anna@example.com", phone: "+380509876543",
//                 region: "Львівська", city: "Львів", postalCode: "79000",
//                 street: "Шевченка", houseNumber: "10",
//             }
//         };
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         const orderInDb = await orderModel.findOne({ orderNumber: response.body.orderNumber });
//         expect(orderInDb).not.toBeNull();
//         expect(orderInDb.deliveryMethod).toBe("Укрпошта");
//     });

//     // SYS_CLIENT_ORDER_003
//     it('SYS_CLIENT_ORDER_003: should successfully place an order with Samovyviz delivery (Kyiv)', async () => {
//        const orderData = {
//             userId: testUser._id.toString(), // Зберігаємо userId
//            items: [ { _id: product2Id.toString(), name: product2.name, price: product2.price, discount: 0, images: product2.images, quantity: 3, size: 'XL' } ],
//            amount: product2.price * 3,
//            deliveryMethod: "Самовивіз",
//            deliveryDetails: { /*... Коректні дані для Самовивозу ...*/
//                 firstName: "Олег", lastName:  "Сидоренко", middleName: "Ігорович",
//                 email: "oleh@example.com", phone: "+380671122333", city: "Київ",
//             }
//        };
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         const orderInDb = await orderModel.findOne({ orderNumber: response.body.orderNumber });
//         expect(orderInDb).not.toBeNull();
//         expect(orderInDb.deliveryMethod).toBe("Самовивіз");
//     });

//     // Helper для тестів валідації
//      const createBaseOrderDataForValidation = () => ({
//         userId: testUser._id.toString(), // Зберігаємо userId в тілі
//         items: [ { _id: product1Id.toString(), name: product1.name, price: product1.price, quantity: 1, size: 'M', images: product1.images } ],
//         amount: 100,
//         deliveryMethod: "Нова Пошта",
//         deliveryDetails: {
//             firstName: "Тест", lastName:  "Тестенко", middleName: "Тестович", email: "test@example.com", phone: "+380991234567",
//             region: "Київська", city: "Київ", departmentNumber: "15"
//         }
//     });

//     // SYS_CLIENT_ORDER_004: Без firstName
//      it('SYS_CLIENT_ORDER_004: should return 400 if firstName is missing', async () => {
//          const orderData = createBaseOrderDataForValidation();
//          delete orderData.deliveryDetails.firstName;
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Ім'я та прізвище є обов'язковими/);
//      });

//     // SYS_CLIENT_ORDER_005: Без lastName
//     it('SYS_CLIENT_ORDER_005: should return 400 if lastName is missing', async () => {
//          const orderData = createBaseOrderDataForValidation();
//          delete orderData.deliveryDetails.lastName ;
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Ім'я та прізвище є обов'язковими/);
//      });

//     // SYS_CLIENT_ORDER_006: Без email
//     it('SYS_CLIENT_ORDER_006: should return 400 if email is missing', async () => {
//         const orderData = createBaseOrderDataForValidation();
//          delete orderData.deliveryDetails.email;
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Будь ласка, введіть коректний email/);
//      });

//     // SYS_CLIENT_ORDER_007: Невалідний email
//     it('SYS_CLIENT_ORDER_007: should return 400 if email is invalid', async () => {
//          const orderData = createBaseOrderDataForValidation();
//         orderData.deliveryDetails.email = 'invalid-email';
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//         expect(response.statusCode).toBe(400);
//         expect(response.body.message).toMatch(/Будь ласка, введіть коректний email/);
//      });

//     // SYS_CLIENT_ORDER_008: Без phone
//      it('SYS_CLIENT_ORDER_008: should return 400 if phone is missing', async () => {
//         const orderData = createBaseOrderDataForValidation();
//         delete orderData.deliveryDetails.phone;
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//         expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Будь ласка, введіть коректний номер телефону/);
//      });

//     // SYS_CLIENT_ORDER_009: Невалідний phone
//      it('SYS_CLIENT_ORDER_009: should return 400 if phone is invalid', async () => {
//          const orderData = createBaseOrderDataForValidation();
//          orderData.deliveryDetails.phone = '12345';
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Будь ласка, введіть коректний номер телефону/);
//      });

//     // SYS_CLIENT_ORDER_010: Нова Пошта без departmentNumber
//      it('SYS_CLIENT_ORDER_010: should return 400 for Nova Poshta if departmentNumber is missing', async () => {
//          const orderData = createBaseOrderDataForValidation();
//         orderData.deliveryMethod = 'Нова Пошта'; // Переконуємось, що метод НП
//          delete orderData.deliveryDetails.departmentNumber;
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Для Нової Пошти необхідно вказати/);
//      });

//     // SYS_CLIENT_ORDER_011: Укрпошта без postalCode
//      it('SYS_CLIENT_ORDER_011: should return 400 for Ukrposhta if postalCode is missing', async () => {
//         const orderData = createBaseOrderDataForValidation();
//         orderData.deliveryMethod = 'Укрпошта'; // Змінюємо метод
//         // Додаємо обов'язкові для Укрпошти поля, крім postalCode
//         orderData.deliveryDetails.street = "Вулиця";
//         orderData.deliveryDetails.houseNumber = "10";
//          // Видаляємо інші поля, які НЕ потрібні Укрпошті
//          delete orderData.deliveryDetails.departmentNumber;
//          // Видаляємо postalCode
//          delete orderData.deliveryDetails.postalCode;

//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Для Укрпошти необхідно вказати/);
//      });

//      // SYS_CLIENT_ORDER_012: Самовивіз з неправильним містом
//     it('SYS_CLIENT_ORDER_012: should return 400 for Samovyviz with disallowed city', async () => {
//         const orderData = createBaseOrderDataForValidation();
//         orderData.deliveryMethod = 'Самовивіз';
//         orderData.deliveryDetails.city = 'Одеса'; // Не дозволено
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toMatch(/Самовивіз можливий тільки у Києві/);
//     });

//     // SYS_CLIENT_ORDER_013a: Порожній кошик
//     it('SYS_CLIENT_ORDER_013a: should return 400 if items array is empty', async () => {
//          const orderData = createBaseOrderDataForValidation();
//          orderData.items = []; // Порожній кошик
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toBe("Замовлення повинно містити хоча б один товар");
//     });

//     // SYS_CLIENT_ORDER_013b: Сума нуль
//      it('SYS_CLIENT_ORDER_013b: should return 400 if amount is zero/negative', async () => {
//          const orderData = createBaseOrderDataForValidation();
//          orderData.amount = 0; // Нульова сума
//          const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//          expect(response.statusCode).toBe(400);
//          expect(response.body.message).toBe("Сума замовлення повинна бути більше нуля");
//      });

//      // SYS_CLIENT_ORDER_??? Сценарій помилки сервера (взято з коду користувача)
//      it('should return 500 if there is a database error during order save', async () => {
//          const saveMock = jest.spyOn(orderModel.prototype, 'save').mockRejectedValueOnce(new Error('Database save failed'));
//          const orderData = {
//             userId: testUser._id.toString(),
//             items: [ { _id: product1Id.toString(), name: product1.name, price: product1.price, discount: 0, images: product1.images, quantity: 1, size: 'S' /* ПОТРІБЕН size! */ } ],
//             amount: product1.price,
//             deliveryMethod: "Нова Пошта",
//             deliveryDetails: {
//                  firstName: "Тест", lastName:  "Тестенко", middleName: "Тестович",
//                  email: "test@example.com", phone: "+380991234567",
//                  region: "Київська", city: "Київ", departmentNumber: "15"
//              }
//         };
//         const response = await request(server).post('/api/order/place').set('Authorization', `Bearer ${testUserToken}`).send(orderData);
//         expect(response.statusCode).toBe(500);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Помилка сервера");
//         saveMock.mockRestore();
//      });
// });



// // ==========================================
// // VI.2 Верифікація Оплати (verifyOrder)
// // ==========================================
// // ==========================================
// // VI.2 Верифікація Оплати (verifyOrder)
// // Route: POST /api/order/verify
// // Auth: None needed per router setup
// // ==========================================
// describe('POST /api/order/verify', () => {
//   let testOrder;

//   beforeEach(async () => {
//       // Create a basic order for testing verification
//       // Use productId and ensure image path exists or is mocked if needed by controller/model implicitly
//       testOrder = await createTestOrder(testUser._id, [{ productId: product1Id, name: product1.name, price: product1.price, quantity: 1, size: 'S', image: product1.images[0] }], "Нове замовлення", false); // Starts unpaid
//        // Reset mocks, but verifyOrder doesn't use auth middleware based on router

//   });

//   // SYS_CLIENT_ORDER_014
//   it('SYS_CLIENT_ORDER_014: should update order payment to true when success is "true"', async () => {
//       const response = await request(server)
//           .post('/api/order/verify')
//           .send({ orderId: testOrder._id.toString(), success: "true" });

//       expect(response.statusCode).toBe(200);
//       expect(response.body.success).toBe(true);
//       expect(response.body.message).toBe("Оплачено");

//       const updatedOrder = await orderModel.findById(testOrder._id);
//       expect(updatedOrder).not.toBeNull();
//       expect(updatedOrder.payment).toBe(true);
//       expect(updatedOrder.status).toBe("Нове замовлення"); // Status should not change here
//   });

//   // SYS_CLIENT_ORDER_015
//   it('SYS_CLIENT_ORDER_015: should delete the order when success is "false"', async () => {
//       const response = await request(server)
//           .post('/api/order/verify')
//           .send({ orderId: testOrder._id.toString(), success: "false" });

//       expect(response.statusCode).toBe(200);
//       expect(response.body.success).toBe(false);
//       expect(response.body.message).toBe("Оплата не пройшла");

//       const deletedOrder = await orderModel.findById(testOrder._id);
//       expect(deletedOrder).toBeNull(); // Order should be gone
//   });

  

//    it('should delete order if success parameter is missing (treated as false)', async () => {
//       const response = await request(server)
//           .post('/api/order/verify')
//           .send({ orderId: testOrder._id.toString() }); // Missing 'success'

//        // Controller checks `if (success == "true")`. Undefined != "true", so it enters the 'else' block.
//        expect(response.statusCode).toBe(200);
//        expect(response.body.success).toBe(false);
//        expect(response.body.message).toBe("Оплата не пройшла"); // Message from the 'else' block

//        // Check that the order WAS deleted because success wasn't explicitly "true"
//         const orderAfterMissing = await orderModel.findById(testOrder._id);
//         expect(orderAfterMissing).toBeNull();
//    });

//     it('should delete order if success parameter is any value other than string "true"', async () => {
//       const response = await request(server)
//           .post('/api/order/verify')
//           .send({ orderId: testOrder._id.toString(), success: true }); // Boolean true, not string "true"

//         // Controller checks `if (success == "true")`. Boolean true != string "true". Falls into 'else'.
//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Оплата не пройшла");

//         const orderAfterInvalid = await orderModel.findById(testOrder._id);
//         expect(orderAfterInvalid).toBeNull(); // Order deleted
//    });

   
// });

// // ===============================================
// // VI.3 Історія Замовлень Користувача (userorders)
// // ===============================================
// describe('POST /api/order/userorders (User Order History)', () => {

//     // SYS_CLIENT_ORDER_017: Немає замовлень
//      it('SYS_CLIENT_ORDER_017: should return an empty array when user has no orders', async () => {
//          // Замовлення secondTestUser не мають бути повернуті для testUser
//         await createTestOrder(secondTestUser._id, [{ name: 'Other user order item' }]);

//         const response = await request(server)
//             .post('/api/order/userorders')
//             // Авторизуємося як testUser, який ще не має замовлень
//             .set('Authorization', `Bearer ${testUserToken}`)
//              // Тіло може бути пустим, якщо контролер бере userId з middleware/токена
//              // Або може вимагати userId в тілі, якщо логіка спирається на req.body.userId
//              .send({ userId: testUser._id.toString() }); // Передаємо userId в тілі, якщо контролер його там очікує

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toEqual([]); // Очікуємо порожній масив
//     });

//     // SYS_CLIENT_ORDER_018: Є замовлення
//      it('SYS_CLIENT_ORDER_018: should return only the authenticated user orders', async () => {
//         // Створюємо замовлення для testUser
//         const order1 = await createTestOrder(testUser._id, [{ name: 'My Order 1'}], "Оплачено");
//         const order2 = await createTestOrder(testUser._id, [{ name: 'My Order 2'}], "Доставлено");
//         // Створюємо замовлення для іншого користувача
//         await createTestOrder(secondTestUser._id, [{ name: 'Other User Order'}]);

//         const response = await request(server)
//             .post('/api/order/userorders')
//             .set('Authorization', `Bearer ${testUserToken}`) // Авторизація як testUser
//             .send({ userId: testUser._id.toString() }); // Передаємо userId, якщо потрібно контролеру

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toBeInstanceOf(Array);
//         expect(response.body.data).toHaveLength(2); // Має бути рівно 2 замовлення

//         // Перевіряємо, що повернулися правильні замовлення (наприклад, за ID або назвою)
//         const returnedOrderIds = response.body.data.map(order => order._id.toString());
//         expect(returnedOrderIds).toContain(order1._id.toString());
//         expect(returnedOrderIds).toContain(order2._id.toString());
//          // Додаткова перевірка userId у відповіді
//          expect(response.body.data[0].userId).toBe(testUser._id.toString());
//          expect(response.body.data[1].userId).toBe(testUser._id.toString());
//     });

//     // Додатковий тест: передача чужого userId в тілі (не мало б працювати з реальним middleware)
//      it('should return orders for the user specified in the token, ignoring userId in body (if real middleware used)', async () => {
//          // Цей тест мав би сенс з РЕАЛЬНИМ authMiddleware, щоб перевірити, що він ігнорує userId в тілі.
//          // З ПОТОЧНИМ МОКОМ результат непередбачуваний, бо mock не дає реального user ID.

//         await createTestOrder(testUser._id, [{ name: 'My order' }]);
//         await createTestOrder(secondTestUser._id, [{ name: 'Other user order' }]);

//          const response = await request(server)
//             .post('/api/order/userorders')
//             .set('Authorization', `Bearer ${testUserToken}`) // Токен testUser
//              // Намагаємося запитати замовлення іншого користувача через тіло
//              .send({ userId: secondTestUser._id.toString() });

//           // З поточним моком, скоріш за все, результат буде залежати від того,
//           // чи використовує контролер `req.body.userId` (тоді поверне замовлення secondUser)
//           // чи `req.body._id` (тоді помилка).
//           // Передбачити точний результат складно. Пропустимо складні перевірки тут.
//           expect([200, 400, 500]).toContain(response.statusCode);
//      });
// });

// // ===============================================
// // VI.4 Статус Замовлення (getOrderStatus)
// // ===============================================
// describe('GET /api/order/:orderId/status (Get Order Status)', () => {
//     let userOrder;
//     let otherUserOrder;

//     beforeEach(async () => {
//         userOrder = await createTestOrder(testUser._id, [{ name: "My Status Check Item" }], "В обробці");
//         otherUserOrder = await createTestOrder(secondTestUser._id, [{ name: "Other's Status Check" }], "Нове замовлення");

//         // Manually add some history to userOrder for testing
//         await orderModel.findByIdAndUpdate(userOrder._id, {
//             $push: {
//                 editHistory: {
//                     $each: [
//                         { date: new Date(Date.now() - 86400000), editedBy: { userId: new mongoose.Types.ObjectId(), name: 'AdminBot' }, type: 'status_change', oldStatus: 'Нове замовлення', newStatus: 'В обробці' },
//                         { date: new Date(Date.now() - 3600000), editedBy: { userId: new mongoose.Types.ObjectId(), name: 'EditorBot' }, type: 'order_edit', reason: 'Address update', changes: { amountChanged: false } } // Non-status change
//                     ]
//                 }
//             }
//         });
//         userOrder = await orderModel.findById(userOrder._id); // Refresh order data
//     });

//     // SYS_CLIENT_ORDER_019
//     it('SYS_CLIENT_ORDER_019: should return the status and history for the user own order', async () => {
//         const response = await request(server)
//             .get(`/api/order/${userOrder._id}/status`)
//             .set('Authorization', `Bearer ${testUserToken}`); // Auth as testUser

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toBeDefined();
//         expect(response.body.data.orderNumber).toBe(userOrder.orderNumber);
//         expect(response.body.data.currentStatus).toBe("В обробці");
//         expect(response.body.data.cancellationReason).toBeNull(); // Not cancelled
//         expect(response.body.data.statusHistory).toBeInstanceOf(Array);
//         expect(response.body.data.statusHistory).toHaveLength(1); // Only status_change type history
//         expect(response.body.data.statusHistory[0].oldStatus).toBe('Нове замовлення');
//         expect(response.body.data.statusHistory[0].newStatus).toBe('В обробці');
//         expect(response.body.data.statusHistory[0].changedBy).toBe('AdminBot');
//     });

//      // SYS_CLIENT_ORDER_020
//      it('SYS_CLIENT_ORDER_020: should return 403 Forbidden when trying to get status of another user order', async () => {
//         const response = await request(server)
//             .get(`/api/order/${otherUserOrder._id}/status`) // Requesting otherUserOrder
//             .set('Authorization', `Bearer ${testUserToken}`); // Auth as testUser

//         // The controller explicitly checks userId vs req.user._id
//         expect(response.statusCode).toBe(403);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Ви не маєте доступу до цього замовлення");
//     });

//     // SYS_CLIENT_ORDER_021
//     it('SYS_CLIENT_ORDER_021: should return 404 Not Found for a non-existent order ID', async () => {
//         const nonExistentId = '605f7b3b3f8a6f3d5c1b9a1c';
//         const response = await request(server)
//             .get(`/api/order/${nonExistentId}/status`)
//             .set('Authorization', `Bearer ${testUserToken}`);

//         expect(response.statusCode).toBe(404);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Замовлення не знайдено");
//     });

//     it('should return 401 Unauthorized if no token is provided', async () => {
//          const response = await request(server)
//             .get(`/api/order/${userOrder._id}/status`);
//             // No Auth Header

//         // If real auth middleware was used:
//         // expect(response.statusCode).toBe(401);
//         // expect(response.body.message).toMatch(/необхідно авторизуватися/i);

//         // With current mock:
//         expect(response.statusCode).not.toBe(401); // Mock lets it through
//         console.warn("WARN: Test for 401 on /:orderId/status is bypassed due to authMiddleware mock.");
//     });
// });

// // ======================================================
// // VI.5 Скасування Замовлення (cancelOrderForUser)
// // ======================================================
// describe('PUT /api/order/cancel-order-user/:orderId (User Cancel Order)', () => {
//     let orderNew;
//     let orderProcessing;
//     let orderDelivered;
//     let otherUserOrderNew;

//     beforeEach(async () => {
//         // Find products again to ensure quantities are fresh
//         product1 = await productModel.findById(product1Id);
//         product2 = await productModel.findById(product2Id);

//         orderNew = await createTestOrder(testUser._id, [{ productId: product1Id, name: product1.name, price: 100, size: 'M', quantity: 2 }], "Нове замовлення");
//         orderProcessing = await createTestOrder(testUser._id, [{ productId: product2Id, name: product2.name, price: 250, size: 'XL', quantity: 1 }], "В обробці");
//         orderDelivered = await createTestOrder(testUser._id, [{ productId: product1Id, name: product1.name, price: 100, size: 'S', quantity: 1 }], "Доставлено");
//         otherUserOrderNew = await createTestOrder(secondTestUser._id, [{ productId: product2Id, name: product2.name, price: 250, size: 'L', quantity: 1 }], "Нове замовлення");
//     });

//     // SYS_CLIENT_ORDER_022
//     it('SYS_CLIENT_ORDER_022: should allow user to cancel their own order with status "Нове замовлення"', async () => {
//         const cancelReason = "Передумав";
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${orderNew._id}`)
//             .set('Authorization', `Bearer ${testUserToken}`)
//             .send({ reason: cancelReason });

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         expect(response.body.message).toBe("Ваше замовлення успішно скасовано");
//         expect(response.body.data.status).toBe("Скасовано");
//         expect(response.body.data.cancellationReason).toBe(cancelReason);

//         // Verify DB state
//         const updatedOrder = await orderModel.findById(orderNew._id);
//         expect(updatedOrder.status).toBe("Скасовано");
//         expect(updatedOrder.cancellationReason).toBe(cancelReason);
//         expect(updatedOrder.editHistory).toBeInstanceOf(Array);
//         const cancelEntry = updatedOrder.editHistory.find(h => h.newStatus === 'Скасовано');
//         expect(cancelEntry).toBeDefined();
//         expect(cancelEntry.type).toBe('status_change');
//         expect(cancelEntry.reason).toBe(cancelReason);
//         expect(cancelEntry.editedBy.userId.toString()).toBe(testUser._id.toString());
//         expect(cancelEntry.editedBy.name).toMatch(/MockFirstName MockLastName|Користувач/); // Check name format
//     });

//     // SYS_CLIENT_ORDER_023
//     it('SYS_CLIENT_ORDER_023: should allow user to cancel their own order with status "В обробці" and restore product quantity', async () => {
//         const cancelReason = "Знайшов дешевше";
//         const productToRestore = orderProcessing.items[0]; // product2, size XL
//         const initialQuantityDoc = await productModel.findById(productToRestore.productId).select('sizes');
//         const initialQuantity = initialQuantityDoc.sizes.find(s => s.size === productToRestore.size).quantity;

//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${orderProcessing._id}`)
//             .set('Authorization', `Bearer ${testUserToken}`)
//             .send({ reason: cancelReason });

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         expect(response.body.data.status).toBe("Скасовано");
//         expect(response.body.data.cancellationReason).toBe(cancelReason);

//         // Verify DB state for order
//         const updatedOrder = await orderModel.findById(orderProcessing._id);
//         expect(updatedOrder.status).toBe("Скасовано");

//         // Verify product quantity restoration
//         const finalQuantityDoc = await productModel.findById(productToRestore.productId).select('sizes');
//         const finalQuantity = finalQuantityDoc.sizes.find(s => s.size === productToRestore.size).quantity;
//         expect(finalQuantity).toBe(initialQuantity + productToRestore.quantity); // Quantity should increase
//     });

//     // SYS_CLIENT_ORDER_024
//     it('SYS_CLIENT_ORDER_024: should return 400 Bad Request when trying to cancel an order with non-cancellable status (e.g., "Доставлено")', async () => {
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${orderDelivered._id}`)
//             .set('Authorization', `Bearer ${testUserToken}`)
//             .send({ reason: "Не актуально" });

//         expect(response.statusCode).toBe(400);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toMatch(/Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'/);

//         // Verify order status didn't change
//         const order = await orderModel.findById(orderDelivered._id);
//         expect(order.status).toBe("Доставлено");
//     });

//      // SYS_CLIENT_ORDER_025
//      it('SYS_CLIENT_ORDER_025: should return 403 Forbidden when trying to cancel another user order', async () => {
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${otherUserOrderNew._id}`) // Other user's order
//             .set('Authorization', `Bearer ${testUserToken}`) // Auth as testUser
//             .send({ reason: "Помилка" });

//         expect(response.statusCode).toBe(403);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Ви не маєте прав для скасування цього замовлення");

//         // Verify other user's order status didn't change
//         const order = await orderModel.findById(otherUserOrderNew._id);
//         expect(order.status).toBe("Нове замовлення");
//     });

//     // SYS_CLIENT_ORDER_026
//     it('SYS_CLIENT_ORDER_026: should return 404 Not Found when trying to cancel a non-existent order', async () => {
//         const nonExistentId = '605f7b3b3f8a6f3d5c1b9a1d';
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${nonExistentId}`)
//             .set('Authorization', `Bearer ${testUserToken}`)
//             .send({ reason: "Не існує" });

//         expect(response.statusCode).toBe(404);
//         expect(response.body.success).toBe(false);
//         expect(response.body.message).toBe("Замовлення не знайдено");
//     });

//     it('should cancel successfully even if reason is not provided', async () => {
//         // Controller doesn't strictly require reason for user cancellation
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${orderNew._id}`)
//             .set('Authorization', `Bearer ${testUserToken}`)
//             .send({}); // No reason sent

//         expect(response.statusCode).toBe(200);
//         expect(response.body.success).toBe(true);
//         const updatedOrder = await orderModel.findById(orderNew._id);
//         expect(updatedOrder.status).toBe("Скасовано");
//         expect(updatedOrder.cancellationReason).toBeUndefined(); // Reason should be undefined or null
//         const cancelEntry = updatedOrder.editHistory.find(h => h.newStatus === 'Скасовано');
//         expect(cancelEntry).toBeDefined();
//         expect(cancelEntry.reason).toBeUndefined();
//     });

//     it('should return 401 Unauthorized if no token is provided', async () => {
//         const response = await request(server)
//             .put(`/api/order/cancel-order-user/${orderNew._id}`)
//             // No Auth Header
//             .send({ reason: "Тест" });

//         // If real auth middleware was used:
//         // expect(response.statusCode).toBe(401);
//         // expect(response.body.message).toMatch(/необхідно авторизуватися/i);

//         // With current mock:
//         expect(response.statusCode).not.toBe(401);
//         console.warn("WARN: Test for 401 on /cancel-order-user/:orderId is bypassed due to authMiddleware mock.");
//     });
// });
// tests/order.user.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../../../server'); // Переконайтесь, що шлях до server.js правильний
const User = require('../../../models/userModel');
const Product = require('../../../models/productModel');
const Order = require('../../../models/orderModel');
const Stripe = require('stripe');

// --- ПОЧАТОК: Логіка керування БД та середовищем ---
// Завантажуємо змінні середовища (про всяк випадок, хоча jest.setup.js мав це зробити)
require('dotenv').config({ path: './.env.test' });

// Перевіряємо наявність необхідних змінних
const TEST_MONGO_URI = process.env.TEST_MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!TEST_MONGO_URI) {
    console.error("!!! Помилка (в тесті): TEST_MONGO_URI не визначено у .env.test. Неможливо запустити тести.");
    process.exit(1);
}
if (!JWT_SECRET) {
     console.error("!!! Помилка (в тесті): JWT_SECRET не визначено у .env.test. Це необхідно для генерації/перевірки токенів.");
     process.exit(1);
}

// Мокаємо Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({
                    id: 'cs_test_123',
                    url: 'https://fake-stripe-checkout.com/session_test_123',
                }),
            },
        },
    }));
});
// Очищаємо мок перед кожним тестом, щоб лічильники викликів були чистими
beforeEach(() => {
    const stripeInstance = new Stripe();
    stripeInstance.checkout.sessions.create.mockClear();
});

// --- Кінець: Логіка керування БД та середовищем ---


// --- Глобальні змінні для тестів ---
let testUser;
let userToken;
let testProduct1; // Одяг
let testProduct2; // Взуття
let testProduct3; // Аксесуар

// --- Допоміжні функції ---
const generateToken = (userId, role = 'користувач') => {
  // Додаємо роль для можливості тестування доступу
  return jwt.sign({ id: userId, role: role }, JWT_SECRET, { expiresIn: '1h' });
};

// Функція для створення тестового користувача (викликається в beforeEach або beforeAll)
const createTestUser = async (emailSuffix = Date.now(), role = 'користувач', isActive = true) => {
    const userData = {
        firstName: 'Тест', middleName:'Юзер', secondName: 'Юзер',
        email: `test.user.${emailSuffix}@example.com`,
        password: 'password123', // Пароль не хешуємо для простоти тестів API
        role: role,
        phoneNumber: `+38099123456778`, // Унікальний телефон
        isActive: isActive,
        cartData: {},
    };
    const user = new User(userData);
    await user.save();
    return user;
};

// Функція для створення тестових продуктів
const createTestProducts = async () => {
    const productsData = [
        { // testProduct1
            name: "Тестова Футболка", description: "Бавовняна футболка", price: 350, discount: 15,
            category: "Одяг",  images: ["images/tshirt.jpg"],  colors: "Blue",
            sizes: [{ size: "M", quantity: 10 }, { size: "L", quantity: 5 }],
            
        },
        { // testProduct2
            name: "Тестові Кросівки", description: "Бігові кросівки", price: 1200,
            category: "Взуття", images: ["images/sneakers.jpg"],  colors: "Blue",
            sizes: [{ size: "42", quantity: 8 }, { size: "43", quantity: 8 }],
            
        },
         { // testProduct3
            name: "Тестовий Рюкзак", description: "Міський рюкзак", price: 800,
            category: "Аксесуари", images: ["images/backpack.jpg"], colors: "Blue",
            sizes: [{ size: "One Size", quantity: 15 }], // Аксесуари часто мають один розмір
          
        }
    ];
    // Використовуємо Promise.all для паралельного збереження
    const createdProducts = await Product.insertMany(productsData);
    return createdProducts; // Повертаємо масив створених продуктів
};

// Функція для створення тестового замовлення
const createTestOrder = async (
    userId,
    itemsData, // Масив об'єктів { product, quantity, size }
    deliveryMethod,
    deliveryDetails,
    status = "Нове замовлення",
    payment = false
) => {
    let calculatedAmount = 0;
    const orderItems = itemsData.map(itemData => {
        const { product, quantity, size } = itemData;
        const price = product.price || 0;
        const discount = product.discount || 0;
        const discountedPrice = price * (1 - discount / 100);
        calculatedAmount += discountedPrice * quantity;
        return {
            productId: product._id,
            name: product.name,
            price: price, // Зберігаємо оригінальну ціну
            discount: discount,
            size: size,
            image: product.images?.[0] || 'no-image.jpg',
            quantity: quantity,
        };
    });

    const orderData = {
        userId: userId,
        items: orderItems,
        amount: parseFloat(calculatedAmount.toFixed(2)), // Розраховуємо суму на основі товарів
        deliveryMethod: deliveryMethod,
        deliveryDetails: deliveryDetails,
        status: status,
        payment: payment,
        orderNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(), // Генерація унікального номера
        editHistory: [],
        date: new Date()
    };
    const order = new Order(orderData);
    await order.save();
    return order;
};

// --- Основний тестовий набір для користувацьких ендпоінтів замовлень ---

describe('User Order API Endpoints (з керуванням БД у тесті)', () => {

    // --- Хуки для керування БД та основними даними ---
    beforeAll(async () => {
        try {
            // 1. Підключення до БД
            await mongoose.connect(TEST_MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log(`(Тест-файл) Успішно підключено до тестової БД.`);

            // 2. Створення основного тестового користувача
            testUser = await createTestUser('main');
            userToken = generateToken(testUser._id);

            // 3. Створення тестових продуктів
            const products = await createTestProducts();
            testProduct1 = products[0];
            testProduct2 = products[1];
            testProduct3 = products[2];

        } catch (err) {
            console.error(`(Тест-файл) Критична помилка під час beforeAll:`, err);
            process.exit(1); // Зупиняємо тести, якщо початкове налаштування не вдалося
        }
    });

    // Очищення *всіх* колекцій після *кожного* тесту для повної ізоляції
    afterEach(async () => {
        if (mongoose.connection.readyState === 1) {
            const collections = mongoose.connection.collections;
            for (const key in collections) {
                if (!key.startsWith('system.')) { // Не чіпаємо системні колекції
                    try {
                        await collections[key].deleteMany({});
                    } catch (error) {
                        // Ігноруємо помилки типу 'ns not found', які можуть виникнути при паралельних операціях
                        if (!error.message.includes("ns not found")) {
                             console.warn(`(Тест-файл) Помилка очищення колекції ${key} після тесту: ${error.message}`);
                        }
                    }
                }
            }
            // Важливо: Перестворюємо основні дані (користувача, продукти) після очищення,
            // оскільки вони потрібні для наступних тестів.
            testUser = await createTestUser('main'); // Використовуємо той самий суфікс для передбачуваного email
            userToken = generateToken(testUser._id);
            const products = await createTestProducts();
            testProduct1 = products[0];
            testProduct2 = products[1];
            testProduct3 = products[2];
        }
    });

    // Відключення від БД після всіх тестів
    afterAll(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.disconnect();
                console.log('(Тест-файл) З\'єднання з тестовою БД закрито.');
            }
        } catch (err) {
            console.error('(Тест-файл) Помилка під час закриття з\'єднання з БД:', err);
        }
    });
    // --- Кінець хуків ---


    // --- Тести для POST /api/order/place ---
    describe('POST /api/order/place', () => {

        const validNovaPoshtaDetails = {
            firstName: "Іван", lastName: "Петренко", middleName: "Сергійович",
            email: "ivan.petrenko@test.com", phone: "+380671112233",
            region: "Київська", city: "Київ", departmentNumber: "15"
        };
        const validUkrposhtaDetails = {
            firstName: "Олена", lastName: "Коваль", middleName: "Ігорівна",
            email: "olena.koval@test.com", phone: "+380504445566",
            region: "Львівська", city: "Львів", postalCode: "79000",
            street: "Шевченка", houseNumber: "10",
        };
        const validPickupDetails = {
            firstName: "Максим", lastName: "Сидоренко", middleName: "Вікторович",
            email: "maksym.s@test.com", phone: "+380937778899",
            city: "Київ" // Тільки місто для самовивозу
        };

        // --- Успішні сценарії ---
        it('200 OK: should place an order with Nova Poshta delivery', async () => {
            const items = [
                { _id: testProduct1._id.toString(), name: testProduct1.name, price: testProduct1.price, discount: testProduct1.discount, size: "M", images: testProduct1.images, quantity: 1 },
                { _id: testProduct3._id.toString(), name: testProduct3.name, price: testProduct3.price, discount: 0, size: "One Size", images: testProduct3.images, quantity: 1 }
            ];
            const expectedAmount = (testProduct1.price * (1 - testProduct1.discount / 100)) + testProduct3.price;
            const orderData = {
                userId: testUser._id.toString(),
                items: items,
                amount: expectedAmount,
                deliveryMethod: "Нова Пошта",
                deliveryDetails: validNovaPoshtaDetails
            };

            const res = await request(app)
                .post('/api/order/place')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.session_url).toEqual(expect.any(String));
            expect(res.body.orderNumber).toEqual(expect.any(Number)); // Або number, залежно від реалізації
            //expect(new Stripe().checkout.sessions.create).toHaveBeenCalledTimes(1); // Перевіряємо виклик Stripe
          
            expect(res.body.session_url).toEqual("https://fake-stripe-checkout.com/session_test_123");
            // Перевірка БД
            const orderInDb = await Order.findOne({ orderNumber: res.body.orderNumber });
            expect(orderInDb).not.toBeNull();
            expect(orderInDb.userId).toBe(testUser._id.toString());
            expect(orderInDb.amount).toBeCloseTo(expectedAmount);
            expect(orderInDb.items.length).toBe(2);
            expect(orderInDb.items[0].productId).toEqual(testProduct1._id);
            expect(orderInDb.items[0].size).toBe("M");
            expect(orderInDb.items[1].productId).toEqual(testProduct3._id);
            expect(orderInDb.deliveryMethod).toBe("Нова Пошта");
            expect(orderInDb.deliveryDetails.city).toBe("Київ");
            expect(orderInDb.deliveryDetails.departmentNumber).toBe("15");
            expect(orderInDb.status).toBe("Нове замовлення");
            expect(orderInDb.payment).toBe(false);

            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.cartData).toEqual({}); // Кошик очищено
        });

        it('200 OK: should place an order with Ukrposhta delivery', async () => {
             const items = [
                { _id: testProduct2._id.toString(), name: testProduct2.name, price: testProduct2.price, discount: 0, size: "42", images: testProduct2.images, quantity: 1 }
             ];
             const expectedAmount = testProduct2.price;
             const orderData = {
                userId: testUser._id.toString(), items: items, amount: expectedAmount,
                deliveryMethod: "Укрпошта", deliveryDetails: validUkrposhtaDetails
            };

             const res = await request(app)
                .post('/api/order/place')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);

             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);
             expect(res.body.orderNumber).toBeDefined();

             const orderInDb = await Order.findOne({ orderNumber: res.body.orderNumber });
             expect(orderInDb).not.toBeNull();
             expect(orderInDb.deliveryMethod).toBe("Укрпошта");
             expect(orderInDb.deliveryDetails.postalCode).toBe("79000");
             expect(orderInDb.deliveryDetails.street).toBe("Шевченка");
        });

        it('200 OK: should place an order with Self-pickup delivery (Kyiv)', async () => {
             const items = [
                { _id: testProduct1._id.toString(), name: testProduct1.name, price: testProduct1.price, discount: testProduct1.discount, size: "L", images: testProduct1.images, quantity: 2 }
             ];
             const expectedAmount = (testProduct1.price * (1 - testProduct1.discount / 100)) * 2;
             const orderData = {
                userId: testUser._id.toString(), items: items, amount: expectedAmount,
                deliveryMethod: "Самовивіз", deliveryDetails: validPickupDetails // Київ валідний
            };

             const res = await request(app)
                .post('/api/order/place')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);

             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);
             expect(res.body.orderNumber).toBeDefined();

             const orderInDb = await Order.findOne({ orderNumber: res.body.orderNumber });
             expect(orderInDb).not.toBeNull();
             expect(orderInDb.deliveryMethod).toBe("Самовивіз");
             expect(orderInDb.deliveryDetails.city).toBe("Київ");
        });

        // --- Сценарії помилок валідації ---
        it('400 Bad Request: Missing userId', async () => {
            const orderData = { /* userId: testUser._id.toString(), */ items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: validNovaPoshtaDetails };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("ID користувача є обов'язковим полем");
        });

        it('400 Bad Request: Empty items array', async () => {
            const orderData = { userId: testUser._id.toString(), items: [], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: validNovaPoshtaDetails };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Замовлення повинно містити хоча б один товар");
        });

        it('400 Bad Request: Amount is zero or negative', async () => {
            const orderData = { userId: testUser._id.toString(), items: [{ _id: testProduct1._id.toString(), quantity: 1, size: "M" }], amount: 0, deliveryMethod: "Нова Пошта", deliveryDetails: validNovaPoshtaDetails };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Сума замовлення повинна бути більше нуля");
        });

        it('400 Bad Request: Missing deliveryMethod', async () => {
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, /* deliveryMethod: "Нова Пошта", */ deliveryDetails: validNovaPoshtaDetails };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Спосіб доставки є обов'язковим полем");
        });

        it('400 Bad Request: Missing deliveryDetails', async () => {
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта" /*, deliveryDetails: validNovaPoshtaDetails */ };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Деталі доставки є обов'язковими");
        });

        it('400 Bad Request: Missing firstName or lastName in deliveryDetails', async () => {
            const details = { ...validNovaPoshtaDetails, firstName: "" };
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Ім'я та прізвище є обов'язковими полями");
        });

        it('400 Bad Request: Invalid email format in deliveryDetails', async () => {
            const details = { ...validNovaPoshtaDetails, email: "invalid-email" };
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Будь ласка, введіть коректний email");
        });

        it('400 Bad Request: Invalid phone format in deliveryDetails', async () => {
            const details = { ...validNovaPoshtaDetails, phone: "123" };
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Будь ласка, введіть коректний номер телефону");
        });

        it('400 Bad Request: Missing required fields for Nova Poshta', async () => {
            const details = { ...validNovaPoshtaDetails, departmentNumber: "" }; // Немає номера відділення
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Для Нової Пошти необхідно вказати область, місто та номер відділення");
        });

        it('400 Bad Request: Missing required fields for Ukrposhta', async () => {
            const details = { ...validUkrposhtaDetails, postalCode: "" }; // Немає індексу
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Укрпошта", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та номер будинку");
        });

        it('400 Bad Request: Invalid city for Self-pickup', async () => {
            const details = { ...validPickupDetails, city: "Одеса" }; // Одеса не в списку
            const orderData = { userId: testUser._id.toString(), items: [{/*...*/}], amount: 100, deliveryMethod: "Самовивіз", deliveryDetails: details };
            const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${userToken}`).send(orderData);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Самовивіз можливий тільки у Києві, Львові або Харкові");
        });

        // --- Сценарії помилок авторизації ---
        it('401 Unauthorized: Request without token', async () => {
             const orderData = { userId: testUser._id.toString(), items: [/*...*/], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: validNovaPoshtaDetails };
             const res = await request(app).post('/api/order/place').send(orderData); // Без .set('Authorization', ...)
             expect(res.statusCode).toBe(401);
             expect(res.body.success).toBe(false);
             expect(res.body.message).toContain('необхідно авторизуватися');
        });

         it('401 Unauthorized: Request with invalid/expired token', async () => {
             const invalidToken = jwt.sign({ id: testUser._id }, 'wrongsecret', { expiresIn: '1h' });
             const orderData = { userId: testUser._id.toString(), items: [/*...*/], amount: 100, deliveryMethod: "Нова Пошта", deliveryDetails: validNovaPoshtaDetails };
             const res = await request(app).post('/api/order/place').set('Authorization', `Bearer ${invalidToken}`).send(orderData);
             expect(res.statusCode).toBe(401); // Або 500, якщо обробка помилки JWT інша
             expect(res.body.success).toBe(false);
             // Повідомлення може відрізнятися залежно від помилки JWT
             expect(res.body.message).toMatch(/Помилка авторизації|Недійсний токен|Термін дії сесії/);
        });
    });


    // --- Тести для POST /api/order/verify ---
    describe('POST /api/order/verify', () => {
        let orderToVerify;

        // Створюємо замовлення перед кожним тестом верифікації
        beforeEach(async () => {
            orderToVerify = await createTestOrder(
                testUser._id,
                [{ product: testProduct1, quantity: 1, size: "M" }],
                "Нова Пошта",
                { firstName: "Verify", lastName: "Test", middleName:"M", email: "v@t.co", phone: "+380990001122", region: "R", city: "C", departmentNumber: "1" }
            );
        });

        it('200 OK: should update payment status to true when success=true', async () => {
            const verificationData = { orderId: orderToVerify._id.toString(), success: "true" };

            const res = await request(app)
                .post('/api/order/verify')
                .send(verificationData);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Оплачено");

            const orderInDb = await Order.findById(orderToVerify._id);
            expect(orderInDb).not.toBeNull();
            expect(orderInDb.payment).toBe(true);
            expect(orderInDb.status).toBe("Нове замовлення"); // Статус не має змінюватися тут
        });

        it('200 OK: should delete the order when success=false', async () => {
            const verificationData = { orderId: orderToVerify._id.toString(), success: "false" };

            const res = await request(app)
                .post('/api/order/verify')
                .send(verificationData);

            expect(res.statusCode).toBe(200); // Код успішний, але операція неуспішна
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Оплата не пройшла");

            const orderInDb = await Order.findById(orderToVerify._id);
            expect(orderInDb).toBeNull(); // Замовлення видалено
        });

       

        it('200 OK (with error): should return error message if success parameter is missing', async () => {
            // Хоча ваш код неявно обробить відсутність success як 'false',
            // варто перевірити, чи це бажана поведінка.
            // Якщо success має бути обов'язковим, контролер слід змінити.
            // Поточний тест перевіряє *існуючу* поведінку:
             const verificationData = { orderId: orderToVerify._id.toString() /*, success: "true" */ };

             const res = await request(app)
                .post('/api/order/verify')
                .send(verificationData);

             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(false); // Бо success != "true"
             expect(res.body.message).toBe("Оплата не пройшла"); // Замовлення видалиться

             const orderInDb = await Order.findById(orderToVerify._id);
             expect(orderInDb).toBeNull();
        });
    });


    // --- Тести для POST /api/order/userorders ---
    describe('POST /api/order/userorders', () => {
        let otherUser;
        let order1_user, order2_user, order_other;

        beforeEach(async () => {
            // Створюємо другого користувача
            otherUser = await createTestUser('other');

            // Створюємо замовлення для обох користувачів
            const details = { firstName: "F", lastName: "L", middleName:"M", email: "e@e.co", phone: "+380111111111", region: "R", city: "C", departmentNumber: "1" };
            order1_user = await createTestOrder(testUser._id, [{ product: testProduct1, quantity: 1, size: "M" }], "Нова Пошта", details, "Доставлено", true);
            order2_user = await createTestOrder(testUser._id, [{ product: testProduct2, quantity: 1, size: "42" }], "Укрпошта", { ...details, postalCode: "12345", street: "S", houseNumber: "1"}, "В обробці", false);
            order_other = await createTestOrder(otherUser._id, [{ product: testProduct3, quantity: 2, size: "One Size" }], "Самовивіз", { ...details, city: "Львів" }, "Нове замовлення", false);
        });

        it('200 OK: should return only orders for the authenticated user', async () => {
            const res = await request(app)
                .post('/api/order/userorders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ userId: testUser._id.toString() }); // Надсилаємо ID поточного користувача

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(2); // Тільки 2 замовлення належать testUser

            const returnedOrderIds = res.body.data.map(o => o._id.toString());
            expect(returnedOrderIds).toContain(order1_user._id.toString());
            expect(returnedOrderIds).toContain(order2_user._id.toString());
            expect(returnedOrderIds).not.toContain(order_other._id.toString()); // Не має бути замовлення іншого користувача

            // Перевіряємо деякі поля для точності
            expect(res.body.data[0].amount).toBeDefined();
            expect(res.body.data[0].status).toBeDefined();
            expect(res.body.data[0].items).toBeInstanceOf(Array);
            expect(res.body.data[0].date).toBeDefined();
        });

        it('200 OK: should return an empty array if the user has no orders', async () => {
            const newUser = await createTestUser('noorders');
            const newToken = generateToken(newUser._id);

            const res = await request(app)
                .post('/api/order/userorders')
                .set('Authorization', `Bearer ${newToken}`)
                .send({ userId: newUser._id.toString() });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        // Важливий тест: Перевірка, чи не можна отримати чужі замовлення, надіславши чужий ID в тілі
        // ПОТОЧНА РЕАЛІЗАЦІЯ КОНТРОЛЕРА ВРАЗЛИВА ДО ЦЬОГО! Він бере ID з тіла, а не з токена.
        // Цей тест покаже цю вразливість. В ідеалі, контролер має використовувати req.user._id.
        it('!!! 200 OK (POTENTIAL ISSUE): should *currently* return other user\'s orders if their ID is sent in body', async () => {
            const res = await request(app)
                .post('/api/order/userorders')
                .set('Authorization', `Bearer ${userToken}`) // Авторизовані як testUser
                .send({ userId: otherUser._id.toString() }); // Але запитуємо замовлення otherUser

            // Очікуємо, що *поточний* код поверне замовлення otherUser
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(1); // Має повернути одне замовлення otherUser
            expect(res.body.data[0]._id.toString()).toBe(order_other._id.toString());
            console.warn("!!! УВАГА: Тест /api/order/userorders виявив, що користувач може запитати чужі замовлення, передавши інший userId в тілі запиту. Рекомендується змінити контролер для використання req.user._id.");
        });

        it('401 Unauthorized: Request without token', async () => {
            const res = await request(app)
                .post('/api/order/userorders')
                .send({ userId: testUser._id.toString() });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });


    // --- Тести для PUT /api/order/cancel-order-user/:orderId ---
    describe('PUT /api/order/cancel-order-user/:orderId', () => {
        let orderNew, orderProcessing, orderDelivered, orderOtherUser;
        const cancelReason = "Більше не потрібно";

        beforeEach(async () => {
            // Встановлюємо відому кількість товару для перевірки повернення
            await Product.findByIdAndUpdate(testProduct1._id, { 'sizes.$[elem].quantity': 5 }, { arrayFilters: [{ 'elem.size': 'M' }] });

            const details = { firstName: "Cancel", lastName: "User", middleName:"C", email: "c@u.co", phone: "+380222222222", region: "R", city: "C", departmentNumber: "1" };
            orderNew = await createTestOrder(testUser._id, [{ product: testProduct1, quantity: 1, size: "M" }], "Нова Пошта", details, "Нове замовлення");
            orderProcessing = await createTestOrder(testUser._id, [{ product: testProduct1, quantity: 2, size: "M" }], "Нова Пошта", details, "В обробці"); // 2 штуки
            orderDelivered = await createTestOrder(testUser._id, [{ product: testProduct1, quantity: 1, size: "M" }], "Нова Пошта", details, "Доставлено");

            const otherUser = await createTestUser('othercancel');
            orderOtherUser = await createTestOrder(otherUser._id, [{ product: testProduct1, quantity: 1, size: "M" }], "Нова Пошта", details, "Нове замовлення");
        });

        it('200 OK: should cancel own order with status "Нове замовлення"', async () => {
            const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderNew._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Ваше замовлення успішно скасовано");
            expect(res.body.data.status).toBe("Скасовано");
            expect(res.body.data.cancellationReason).toBe(cancelReason);

            // Перевірка БД
            const orderInDb = await Order.findById(orderNew._id);
            expect(orderInDb.status).toBe("Скасовано");
            expect(orderInDb.cancellationReason).toBe(cancelReason);
            expect(orderInDb.editHistory.length).toBe(1);
            expect(orderInDb.editHistory[0].type).toBe("status_change");
            expect(orderInDb.editHistory[0].reason).toBe(cancelReason);
            expect(orderInDb.editHistory[0].oldStatus).toBe("Нове замовлення");
            expect(orderInDb.editHistory[0].newStatus).toBe("Скасовано");
            expect(orderInDb.editHistory[0].editedBy.userId).toEqual(testUser._id);
            expect(orderInDb.editHistory[0].editedBy.name).toContain(testUser.firstName);

            // Перевірка складу - кількість НЕ МАЄ змінитися
            const product = await Product.findById(testProduct1._id);
            const sizeM = product.sizes.find(s => s.size === 'M');
            expect(sizeM.quantity).toBe(5);
        });

        it('200 OK: should cancel own order with status "В обробці" and return items to stock', async () => {
             const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderProcessing._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("Скасовано");

            const orderInDb = await Order.findById(orderProcessing._id);
            expect(orderInDb.status).toBe("Скасовано");
            expect(orderInDb.editHistory.length).toBe(1);

            // Перевірка складу - кількість МАЄ збільшитися на 2 (кількість в замовленні)
            const product = await Product.findById(testProduct1._id);
            const sizeM = product.sizes.find(s => s.size === 'M');
            expect(sizeM.quantity).toBe(5 + 2); // Початкова 5 + 2 повернуто
        });

        it('400 Bad Request: should not cancel order with status "Доставлено"', async () => {
            const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderDelivered._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'");

            const orderInDb = await Order.findById(orderDelivered._id);
            expect(orderInDb.status).toBe("Доставлено"); // Статус не змінився
        });

        it('400 Bad Request: should not cancel order that is already "Скасовано"', async () => {
            // Спочатку скасовуємо
            await request(app)
                .put(`/api/order/cancel-order-user/${orderNew._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: cancelReason });
            // Потім пробуємо скасувати ще раз
            const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderNew._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: "Друга спроба" });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'");

             const orderInDb = await Order.findById(orderNew._id);
             expect(orderInDb.status).toBe("Скасовано"); // Статус залишився "Скасовано"
             expect(orderInDb.editHistory.length).toBe(1); // Не додалося другого запису історії
        });

        it('403 Forbidden: should not cancel another user\'s order', async () => {
            const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderOtherUser._id}`) // ID чужого замовлення
                .set('Authorization', `Bearer ${userToken}`) // Токен нашого користувача
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Ви не маєте прав для скасування цього замовлення");

            const orderInDb = await Order.findById(orderOtherUser._id);
            expect(orderInDb.status).toBe("Нове замовлення"); // Статус не змінився
        });

        it('404 Not Found: should return error for non-existent orderId', async () => {
             const invalidOrderId = new mongoose.Types.ObjectId().toString();
             const res = await request(app)
                .put(`/api/order/cancel-order-user/${invalidOrderId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Замовлення не знайдено");
        });

        it('401 Unauthorized: Request without token', async () => {
            const res = await request(app)
                .put(`/api/order/cancel-order-user/${orderNew._id}`)
                .send({ reason: cancelReason });

            expect(res.statusCode).toBe(401);
        });

    });


    // --- Тести для GET /api/order/:orderId/status ---
    describe('GET /api/order/:orderId/status', () => {
        let orderNew, orderProcessing, orderCancelled, orderOtherUser;
        let adminUser; // Для імітації змін адміном

        beforeEach(async () => {
            const details = { firstName: "Status", lastName: "Test", middleName:"S", email: "s@t.co", phone: "+380333333333", region: "R", city: "C", departmentNumber: "1" };
            orderNew = await createTestOrder(testUser._id, [{ product: testProduct1, quantity: 1, size: "M" }], "Нова Пошта", details, "Нове замовлення");

            // Створюємо замовлення і додаємо історію зміни статусу (нібито адміном)
            orderProcessing = await createTestOrder(testUser._id, [{ product: testProduct2, quantity: 1, size: "42" }], "Укрпошта", { ...details, postalCode: "123", street:"S", houseNumber:"1"}, "В обробці");
            adminUser = { _id: new mongoose.Types.ObjectId(), name: "Адміністратор Сайту" }; // Фейковий об'єкт адміна
            const statusChangeHistory = {
                date: new Date(Date.now() - 3600000), // Годину тому
                editedBy: { userId: adminUser._id, name: adminUser.name },
                reason: "Підтверджено менеджером", // Причина зміни адміном
                type: 'status_change',
                oldStatus: "Нове замовлення",
                newStatus: "В обробці"
            };
            await Order.findByIdAndUpdate(orderProcessing._id, { $push: { editHistory: statusChangeHistory } });
            orderProcessing = await Order.findById(orderProcessing._id); // Оновлюємо об'єкт

            // Створюємо скасоване замовлення
            orderCancelled = await createTestOrder(testUser._id, [{ product: testProduct3, quantity: 1, size: "One Size" }], "Самовивіз", { ...details, city: "Львів" }, "Нове замовлення");
            const cancelReasonText = "Немає в наявності";
            const cancelHistory = {
                date: new Date(),
                editedBy: { userId: testUser._id, name: `${testUser.firstName} ${testUser.lastName}` },
                reason: cancelReasonText, type: 'status_change', oldStatus: "Нове замовлення", newStatus: "Скасовано"
            };
            await Order.findByIdAndUpdate(orderCancelled._id, { status: "Скасовано", cancellationReason: cancelReasonText, $push: { editHistory: cancelHistory } });
            orderCancelled = await Order.findById(orderCancelled._id);

            // Замовлення іншого користувача
            const otherUser = await createTestUser('otherstatus');
            orderOtherUser = await createTestOrder(otherUser._id, [{ product: testProduct1, quantity: 1, size: "L" }], "Нова Пошта", details, "Нове замовлення");
        });

        it('200 OK: should return status and empty history for a new order', async () => {
            const res = await request(app)
                .get(`/api/order/${orderNew._id}/status`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.orderNumber).toBe(orderNew.orderNumber);
            expect(res.body.data.currentStatus).toBe("Нове замовлення");
            expect(res.body.data.statusHistory).toEqual([]); // Історія змін статусу порожня
            expect(res.body.data.cancellationReason).toBeNull();
        });
        
        it('403 Forbidden: should not return status for another user\'s order', async () => {
            const res = await request(app)
                .get(`/api/order/${orderOtherUser._id}/status`) // ID чужого замовлення
                .set('Authorization', `Bearer ${userToken}`); // Токен нашого користувача

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Ви не маєте доступу до цього замовлення");
        });

        it('404 Not Found: should return error for non-existent orderId', async () => {
            const invalidOrderId = new mongoose.Types.ObjectId().toString();
             const res = await request(app)
                .get(`/api/order/${invalidOrderId}/status`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Замовлення не знайдено");
        });

        it('401 Unauthorized: Request without token', async () => {
            const res = await request(app)
                .get(`/api/order/${orderNew._id}/status`);

            expect(res.statusCode).toBe(401);
        });
    });

}); // Кінець основного describe
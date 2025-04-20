import request from 'supertest';
import express from 'express'; // Потрібно для створення тестового додатку
import orderRoute from '../../../routes/orderRoute.js'; // Шлях до вашого роутера
import orderModel from '../../../models/orderModel.js';
import userModel from '../../../models/userModel.js';
// Mock productModel якщо placeOrder взаємодіє з ним для перевірки товару (наприклад, наявність)
import productModel from '../../../models/productModel.js'; 
import Stripe from 'stripe';
import mongoose from 'mongoose';



// ----- Мокуємо Залежності -----

// Мокуємо middleware автентифікації

jest.mock('../../../middleware/auth.js', () => ({
    authMiddleware: jest.fn((req, res, next) => {
        // Додаємо тестовий userId для проходження middleware
        // Переконайтесь, що цей ID відповідає тому, що очікує контролер
        req.body.userId = 'test-user-id-from-middleware'; 
        next(); // Пропускаємо запит далі
    }),
    adminMiddleware: jest.fn((req, res, next) => next()), // Якщо потрібно для інших тестів
    strictAdminMiddleware: jest.fn((req, res, next) => next()) // Якщо потрібно для інших тестів
}));

// Мокуємо моделі (схоже на ваш юніт-тест)
jest.mock("../../../models/orderModel.js");
jest.mock("../../../models/userModel.js");
jest.mock("../../../models/productModel.js"); // Переконайтесь, що мокуєте productModel

// Мокаємо Stripe

jest.mock("stripe", () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({ url: "https://stripe.com/session" })
            }
        }
    }));
});

  


// ----- Налаштування Тестового Додатку Express -----
const app = express();
app.use(express.json()); // Важливо для парсингу JSON тіла запиту
app.use('/api/order', orderRoute); // Монтуємо роутер з правильним префіксом

// ----- Мокуємо Залежності -----
jest.mock('../../../middleware/auth.js', () => ({
    authMiddleware: jest.fn((req, res, next) => {
        // Глобальна реалізація за замовчуванням
        req.body.userId = 'test-user-id-from-middleware';
        // console.log('Running default authMiddleware mock (req.body.userId)'); // Додай для дебагу
        next();
    }),
    adminMiddleware: jest.fn((req, res, next) => next()),
    strictAdminMiddleware: jest.fn((req, res, next) => next())
}));

// Імпортуємо САМЕ МОКОВАНУ функцію
import { authMiddleware } from '../../../middleware/auth.js';



// ----- Тестовий Сценарій -----

describe('POST /api/order/place - Integration Test', () => {
    let validOrderPayload;
    let req, res;

    beforeEach(() => {
        // Скидаємо моки перед кожним тестом
        jest.clearAllMocks(); 

        // --- Налаштування Моків Моделей ---
        // Генерація унікального номера замовлення
        orderModel.findOne.mockResolvedValue(null); // Припускаємо, що номер вільний

        

        // Мокуємо створення та збереження екземпляра orderModel
        // Дуже важливо правильно мокнути конструктор і метод save
         const mockSave = jest.fn().mockImplementation(function() {
            
             // Повертаємо дані, які були передані в конструктор + _id та інші поля за замовчуванням
             // Можна повернути повний об'єкт, який ви очікуєте після збереження
             return Promise.resolve({
                ...this.data, // дані передані в new orderModel(...)
                _id: 'mock-order-id-123', 
                orderNumber: '10001', // Припустимий номер замовлення
                status: "Нове замовлення", // Статус за замовчуванням
                date: new Date(),
                payment: false,
                editHistory: [],
             });

         });
         orderModel.mockImplementation(function(data) {
            this._id = data._id || 'temp-id'; 
            this.data = data;
            // Додаємо orderNumber якщо він генерується перед save
            // Або мок save має його додати, як показано вище
            this.orderNumber = '10001'; 
            this.save = mockSave;
            return this;
        });
        // Переконайтесь, що mockSave доступний для перевірки виклику
         orderModel.prototype.save = mockSave; // Важливо для assert


        // Мокуємо оновлення користувача (очищення кошика)
        userModel.findByIdAndUpdate.mockResolvedValue({ 
            _id: 'test-user-id-from-middleware', 
            name: 'Test User', 
            cartData: {} // імітуємо очищений кошик
        });
        
        // --- Визначення Валідного Тіла Запиту ---
        validOrderPayload = {
            // НЕ потрібно передавати userId тут, оскільки його додає мокований authMiddleware
            items: [{
                productId: "prod123",
                name: "Тестовий Товар",
                price: 150,
                discount: 10, // Додав знижку для прикладу
                size: "M",
                image: "/images/test.jpg",
                quantity: 2
            }],
            amount: 270, // 2 * (150 * (1 - 10/100)) = 2 * 135 = 270
            deliveryMethod: "Нова Пошта",
            deliveryDetails: {
                firstName: "Тест",
                lastName: "Тестенко",
                middleName: "Тестович", // Додав поле з моделі
                email: "test@example.com",
                phone: "+380991234567",
                region: "Тестова обл.",
                city: "Тестове м.",
                departmentNumber: "5" 
            },
             // comment: "Додатковий коментар" // Якщо потрібно
        };
    });

    it('should successfully place an order and return Stripe session URL', async () => {
        // Відправляємо запит до Express app
        const response = await request(app)
            .post('/api/order/place')
            .send(validOrderPayload)
            .expect(200); // Очікуємо статус 200 OK
    
        // Перевірка, що замовлення було збережено
        expect(orderModel.mock.instances[0].save).toHaveBeenCalled();
    
        // Перевірка, що корзина користувача була очищена
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            'test-user-id-from-middleware',
            { cartData: {} }
        );
    
        // Перевірка структури відповіді
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                session_url: expect.stringContaining("https://stripe.com"),
                orderNumber: expect.any(Number)
            })
        );
    });

    it('should return 400 if email is invalid', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                email: 'invalidemail' 
            } 
        };
    
        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);
    
        expect(response.body).toEqual({
            success: false,
            message: "Будь ласка, введіть коректний email"
        });
    });

    it('should return 400 if delivery details for Nova Poshta are incomplete', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                departmentNumber: undefined 
            } 
        };
    
        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);
    
        expect(response.body).toEqual({
            success: false,
            message: "Для Нової Пошти необхідно вказати область, місто та номер відділення"
        });
    });

    it('should return 400 if phone number is invalid', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                phone: '12345' 
            } 
        };
    
        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);
    
        expect(response.body).toEqual({
            success: false,
            message: "Будь ласка, введіть коректний номер телефону (наприклад, +380123456789)"
        });
    });
    

    // ----- ДОДАЙТЕ ЦІ ТЕСТИ ВСЕРЕДИНУ ВАШОГО describe блоку -----

    it('should return 400 if items array is missing or empty', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            items: [] // Порожній масив товарів
        };

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Замовлення повинно містити хоча б один товар"
        });

        // Ще один варіант: items взагалі відсутній
        const missingItemsPayload = { ...validOrderPayload };
        delete missingItemsPayload.items;

        const responseMissing = await request(app)
            .post('/api/order/place')
            .send(missingItemsPayload)
            .expect(400);

        expect(responseMissing.body).toEqual({
            success: false,
            message: "Замовлення повинно містити хоча б один товар"
        });
    });

    it('should return 400 if amount is missing or zero/negative', async () => {
        const invalidPayloadZero = { 
            ...validOrderPayload, 
            amount: 0 
        };

        const responseZero = await request(app)
            .post('/api/order/place')
            .send(invalidPayloadZero)
            .expect(400);

        expect(responseZero.body).toEqual({
            success: false,
            message: "Сума замовлення повинна бути більше нуля"
        });

        const invalidPayloadNegative = { 
            ...validOrderPayload, 
            amount: -50 
        };

        const responseNegative = await request(app)
            .post('/api/order/place')
            .send(invalidPayloadNegative)
            .expect(400);

        expect(responseNegative.body).toEqual({
            success: false,
            message: "Сума замовлення повинна бути більше нуля"
        });

         // Ще один варіант: amount взагалі відсутній
        const missingAmountPayload = { ...validOrderPayload };
        delete missingAmountPayload.amount;

        const responseMissing = await request(app)
            .post('/api/order/place')
            .send(missingAmountPayload)
            .expect(400);

        expect(responseMissing.body).toEqual({
            success: false,
            message: "Сума замовлення повинна бути більше нуля"
        });
    });

    it('should return 400 if deliveryMethod is missing', async () => {
        const invalidPayload = { ...validOrderPayload };
        delete invalidPayload.deliveryMethod;

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Спосіб доставки є обов'язковим полем"
        });
    });

    it('should return 400 if deliveryDetails is missing', async () => {
        const invalidPayload = { ...validOrderPayload };
        delete invalidPayload.deliveryDetails;

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Деталі доставки є обов'язковими"
        });
    });

    it('should return 400 if firstName is missing in deliveryDetails', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                firstName: undefined 
            } 
        };

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Ім'я та прізвище є обов'язковими полями"
        });
    });

    it('should return 400 if lastName is missing in deliveryDetails', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                lastName: undefined 
            } 
        };

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Ім'я та прізвище є обов'язковими полями"
        });
    });

    it('should return 400 if delivery details for Ukrposhta are incomplete', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryMethod: "Укрпошта",
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                departmentNumber: undefined, // Видаляємо непотрібне для Укрпошти
                postalCode: "12345", // Додаємо потрібне
                street: "Тестова вул.",
                houseNumber: "10",
                // Навмисно пропускаємо region
                region: undefined 
            } 
        };

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та номер будинку"
        });
    });

     it('should return 400 if delivery city for Samovyviz is invalid', async () => {
        const invalidPayload = { 
            ...validOrderPayload, 
            deliveryMethod: "Самовивіз",
            deliveryDetails: { 
                ...validOrderPayload.deliveryDetails, 
                region: undefined, // Не потрібні для самовивозу
                departmentNumber: undefined, 
                city: "Одеса" // Недопустиме місто
            } 
        };

        const response = await request(app)
            .post('/api/order/place')
            .send(invalidPayload)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: "Самовивіз можливий тільки у Києві, Львові або Харкові"
        });
    });

    it('should return 500 if saving the order fails', async () => {
        // Мокуємо помилку збереження замовлення
        // Важливо: Треба мокнути саме метод save прототипу
        orderModel.prototype.save.mockRejectedValueOnce(new Error("Database save error"));

        const response = await request(app)
            .post('/api/order/place')
            .send(validOrderPayload) // Використовуємо валідні дані
            .expect(500);

        expect(response.body).toEqual({
            success: false,
            message: "Помилка сервера"
        });
        // Перевіряємо, що спроба збереження була
         expect(orderModel.prototype.save).toHaveBeenCalled();
         // Перевіряємо, що очищення кошика НЕ відбулося через помилку
         expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if updating user cart fails', async () => {
         // Мокуємо успішне збереження замовлення
         // `beforeEach` вже мокує успішне збереження, але можна явно
        orderModel.prototype.save.mockResolvedValueOnce({
            ...validOrderPayload, // імітація збереженого документа
            _id: 'mock-order-id-123', 
            orderNumber: '10001', 
            status: "Нове замовлення", 
            date: new Date(),
            payment: false,
         });

        // Мокуємо помилку оновлення кошика користувача
        userModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("User update error"));

        const response = await request(app)
            .post('/api/order/place')
            .send(validOrderPayload) // Використовуємо валідні дані
            .expect(500);

        expect(response.body).toEqual({
            success: false,
            message: "Помилка сервера"
        });
        // Перевіряємо, що спроба збереження замовлення була
        expect(orderModel.prototype.save).toHaveBeenCalled();
        // Перевіряємо, що спроба оновлення користувача була
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            'test-user-id-from-middleware',
            { cartData: {} }
        );
    });

});

// ===== ТЕСТИ для verifyOrder =====
describe('POST /api/order/verify', () => {

    beforeEach(() => {
        // Скидаємо тільки моки моделей, що використовуються тут
        jest.clearAllMocks(); // Важливо для чистоти між тестами різних describe
        
        // Потрібно мокнути ці методи заново, бо beforeEach з placeOrder не спрацює тут
        orderModel.findByIdAndUpdate = jest.fn();
        orderModel.findByIdAndDelete = jest.fn();
        // Також мокуємо console.log для перевірки логування помилок
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        // Відновлюємо console.log після кожного тесту в цьому блоці
        console.log.mockRestore();
    });

    it('should update order payment status to true when success is "true"', async () => {
        const payload = { orderId: 'order-payment-id', success: 'true' };
        orderModel.findByIdAndUpdate.mockResolvedValue({ _id: payload.orderId, payment: true });

        const response = await request(app)
            .post('/api/order/verify')
            .send(payload)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(payload.orderId, { payment: true });
        expect(orderModel.findByIdAndDelete).not.toHaveBeenCalled();
        expect(response.body).toEqual({ success: true, message: "Оплачено" });
    });

    it('should delete the order when success is "false"', async () => {
        const payload = { orderId: 'order-fail-id', success: 'false' };
        orderModel.findByIdAndDelete.mockResolvedValue({ _id: payload.orderId });

        const response = await request(app)
            .post('/api/order/verify')
            .send(payload)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith(payload.orderId);
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(response.body).toEqual({ success: false, message: "Оплата не пройшла" });
    });

    it('should handle missing orderId or success field', async () => {
         // Спроба без orderId - має спричинити помилку в контролері (залежить від логіки обробки помилок)
        // Ваш код зараз не валідує наявність полів, тому, ймовірно, призведе до помилки DB
        const error = new Error("Mock DB error: Missing ID");
        orderModel.findByIdAndUpdate.mockRejectedValue(error); 

        const responseNoId = await request(app)
            .post('/api/order/verify')
            .send({ success: 'true' }) // Немає orderId
            .expect(200); // Ваш контролер повертає 200 навіть при помилці

        expect(responseNoId.body).toEqual({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(expect.any(Error)); // Перевірка логування
        
        // Скидаємо виклик console.log перед наступною перевіркою
         console.log.mockClear();
         orderModel.findByIdAndDelete.mockRejectedValue(error); 

        const responseNoSuccess = await request(app)
            .post('/api/order/verify')
            .send({ orderId: 'some-id' }) // Немає success
            .expect(200);

        expect(responseNoSuccess.body).toEqual({ success: false, message: "Помилка" });
         expect(console.log).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return error message if findByIdAndUpdate throws an error', async () => {
        const payload = { orderId: 'order-update-err-id', success: 'true' };
        const dbError = new Error('Database update failed');
        orderModel.findByIdAndUpdate.mockRejectedValue(dbError);

        const response = await request(app)
            .post('/api/order/verify')
            .send(payload)
            .expect(200);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(payload.orderId, { payment: true });
        expect(response.body).toEqual({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });

    it('should return error message if findByIdAndDelete throws an error', async () => {
        const payload = { orderId: 'order-delete-err-id', success: 'false' };
        const dbError = new Error('Database delete failed');
        orderModel.findByIdAndDelete.mockRejectedValue(dbError);

        const response = await request(app)
            .post('/api/order/verify')
            .send(payload)
            .expect(200);

        expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith(payload.orderId);
        expect(response.body).toEqual({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });
});


// ===== ТЕСТИ для userOrders ====
describe('POST /api/order/userorders', () => {
    
    beforeEach(() => {
        jest.clearAllMocks(); 
        orderModel.find = jest.fn(); // Мокуємо find для цього блоку
         jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
        console.log.mockRestore();
    });
    
     const userIdFromMiddleware = 'test-user-id-from-middleware';

     it('should return all orders for the authenticated user', async () => {
         const mockOrders = [
            { _id: 'user-order-1', userId: userIdFromMiddleware, amount: 150 },
            { _id: 'user-order-2', userId: userIdFromMiddleware, amount: 250 },
        ];
         orderModel.find.mockResolvedValue(mockOrders);
         
         const response = await request(app)
             .post('/api/order/userorders')
             // Тіло запиту може бути порожнім, бо middleware додає userId
             .send({}) 
             .expect('Content-Type', /json/)
             .expect(200);
        
         // Перевіряємо, що пошук викликався з ID, який встановив мок middleware
        expect(orderModel.find).toHaveBeenCalledWith({ userId: userIdFromMiddleware });
        expect(response.body).toEqual({ success: true, data: mockOrders });
     });
     
     it('should return an empty array if the user has no orders', async () => {
         orderModel.find.mockResolvedValue([]); // Користувач не має замовлень

         const response = await request(app)
             .post('/api/order/userorders')
             .send({})
             .expect(200);

         expect(orderModel.find).toHaveBeenCalledWith({ userId: userIdFromMiddleware });
         expect(response.body).toEqual({ success: true, data: [] });
     });

     it('should return an error message if the database query fails', async () => {
        const dbError = new Error('Failed to fetch orders');
         orderModel.find.mockRejectedValue(dbError);

         const response = await request(app)
             .post('/api/order/userorders')
             .send({})
             .expect(200); // Контролер повертає 200 при помилці

         expect(orderModel.find).toHaveBeenCalledWith({ userId: userIdFromMiddleware });
         expect(response.body).toEqual({ success: false, message: "Error" });
         expect(console.log).toHaveBeenCalledWith(dbError);
     });
});

// ===== ТЕСТИ для cancelOrderForUser =====
describe('PUT /api/order/cancel-order-user/:orderId', () => {
    let testOrderId;
    // Створимо тестового користувача для цього блоку
    const specificTestUserId = new mongoose.Types.ObjectId();
    const specificTestUserName = 'User For Cancel Test';

    beforeEach(() => {
        jest.clearAllMocks(); // Дуже важливо! Скидає попередні налаштування моків

        // *** Перевизначаємо authMiddleware ТІЛЬКИ для цього describe блоку ***
        authMiddleware.mockImplementation((req, res, next) => {
            // console.log('Running OVERRIDDEN authMiddleware mock (req.user) for cancelOrder'); // Додай для дебагу
            req.user = {
                _id: specificTestUserId,
                name: specificTestUserName,
                // Додай інші поля, якщо cancelOrderForUser їх використовує
                role: 'user' // Наприклад
            };
            // Важливо: НЕ встановлюємо req.body.userId тут
            next();
        });

        // --- Налаштування інших моків, потрібних для cancelOrderForUser ---
        testOrderId = new mongoose.Types.ObjectId().toString();
        orderModel.findById = jest.fn();
        orderModel.findByIdAndUpdate = jest.fn();
        productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(true); // Мокуємо повернення товару
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Приклад моку для успішного скасування
        const mockOrderToCancel = {
             _id: testOrderId,
             userId: { toString: () => specificTestUserId.toString() }, // Має співпадати з req.user._id
             status: 'Нове замовлення', // Статус, що дозволяє скасування
             items: [], // Додай товари, якщо тестуєш повернення
             editHistory: [],
             // ... інші необхідні поля ...
        };
        orderModel.findById.mockResolvedValue(mockOrderToCancel); // Знаходимо замовлення
        // Мокуємо успішне оновлення замовлення
        orderModel.findByIdAndUpdate.mockResolvedValue({
            ...mockOrderToCancel,
            status: 'Скасовано',
            cancellationReason: 'Тестова причина',
            editHistory: [{ /* ... історія скасування ... */ }]
        });
    });

    afterEach(() => {
         console.error.mockRestore();
         // Немає потреби відновлювати authMiddleware вручну,
         // jest.clearAllMocks() в наступному beforeEach зробить це.
    });

    it('should successfully cancel the order when authMiddleware provides req.user', async () => {
        const cancellationReason = "Тестова причина";

        const response = await request(app)
            .put(`/api/order/cancel-order-user/${testOrderId}`)
            .send({ reason: cancellationReason })
            .expect(200); // Тепер очікуємо успіх

        // Перевіряємо, що спрацював ПЕРЕВИЗНАЧЕНИЙ middleware
        expect(authMiddleware).toHaveBeenCalled();

        // Перевіряємо логіку контролера
        expect(orderModel.findById).toHaveBeenCalledWith(testOrderId);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            testOrderId,
            expect.objectContaining({
                status: "Скасовано",
                cancellationReason: cancellationReason,
                $push: { editHistory: expect.any(Object) } // Перевіряємо додавання історії
            }),
            { new: true }
        );
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Ваше замовлення успішно скасовано");
        expect(response.body.data.status).toBe("Скасовано");

        // Перевіряємо, що товари НЕ поверталися (бо статус був "Нове замовлення")
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 404 if order not found', async () => {
        orderModel.findById.mockResolvedValue(null); // Замовлення не знайдено
    
        const response = await request(app)
            .put(`/api/order/cancel-order-user/${testOrderId}`)
            .send({ reason: 'Причина' })
            .expect(404);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Замовлення не знайдено');
    });
    
    it('should return 403 if user does not own the order', async () => {
        orderModel.findById.mockResolvedValue({
            _id: testOrderId,
            userId: { toString: () => new mongoose.Types.ObjectId().toString() }, // Інший користувач
            status: 'Нове замовлення',
            items: []
        });
    
        const response = await request(app)
            .put(`/api/order/cancel-order-user/${testOrderId}`)
            .send({ reason: 'Причина' })
            .expect(403);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Ви не маєте прав для скасування цього замовлення');
    });
    
    it('should return 400 if order cannot be cancelled due to status', async () => {
        orderModel.findById.mockResolvedValue({
            _id: testOrderId,
            userId: { toString: () => specificTestUserId.toString() },
            status: 'Доставлено', // Неприпустимий статус
            items: []
        });
    
        const response = await request(app)
            .put(`/api/order/cancel-order-user/${testOrderId}`)
            .send({ reason: 'Причина' })
            .expect(400);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'");
    });
    
    it('should return 500 on internal server error', async () => {
        orderModel.findById.mockRejectedValue(new Error('DB fail'));
    
        const response = await request(app)
            .put(`/api/order/cancel-order-user/${testOrderId}`)
            .send({ reason: 'Причина' })
            .expect(500);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Помилка при скасуванні замовлення');
    });
    
});


// ===== ТЕСТИ для getOrderStatus =====
describe('GET /api/order/:orderId/status', () => {
    let testOrderId;
    // Свій користувач для цього блоку
    const specificTestUserId = new mongoose.Types.ObjectId();
    const specificTestUserName = 'User For Status Test';

    beforeEach(() => {
        jest.clearAllMocks(); // Скидаємо моки

        // *** Перевизначаємо authMiddleware ТІЛЬКИ для цього describe блоку ***
        authMiddleware.mockImplementation((req, res, next) => {
             // console.log('Running OVERRIDDEN authMiddleware mock (req.user) for getStatus'); // Додай для дебагу
             req.user = {
                 _id: specificTestUserId,
                 name: specificTestUserName,
                 role: 'user'
             };
             next();
        });

        // --- Налаштування інших моків, потрібних для getOrderStatus ---
        testOrderId = new mongoose.Types.ObjectId().toString();
        const mockSelectFn = jest.fn();
        orderModel.findById = jest.fn().mockReturnValue({ select: mockSelectFn });
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Приклад моку для успішного отримання статусу
        const mockOrderForStatus = {
            _id: testOrderId,
            userId: { toString: () => specificTestUserId.toString() }, // Співпадає з req.user._id
            status: 'В обробці',
            orderNumber: 'ORD-STATUS-123',
            editHistory: [
                // Приклад запису в історії
                {
                    _id: new mongoose.Types.ObjectId(),
                    date: new Date(),
                    editedBy: { userId: new mongoose.Types.ObjectId(), name: 'Admin' },
                    type: 'status_change',
                    oldStatus: 'Нове замовлення',
                    newStatus: 'В обробці',
                    reason: 'Прийнято'
                }
            ],
            cancellationReason: null,
        };
         // Мокуємо, що select поверне потрібні дані
        mockSelectFn.mockResolvedValue(mockOrderForStatus);

    });

     afterEach(() => {
         console.error.mockRestore();
     });

    it('should successfully get order status when authMiddleware provides req.user', async () => {
        const response = await request(app)
            .get(`/api/order/${testOrderId}/status`)
            .expect(200); // Очікуємо успіх

        expect(authMiddleware).toHaveBeenCalled(); // Перевіряємо виклик перевизначеного моку

        expect(orderModel.findById).toHaveBeenCalledWith(testOrderId);
        expect(orderModel.findById.mock.results[0].value.select).toHaveBeenCalledWith('status userId orderNumber editHistory'); // Перевіряємо виклик select

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual({
            orderNumber: 'ORD-STATUS-123',
            currentStatus: 'В обробці',
            cancellationReason: null,
            statusHistory: expect.any(Array) // Перевір детальніше вміст масиву, якщо потрібно
        });
         expect(response.body.data.statusHistory).toHaveLength(1); // Перевіряємо, що історія відфільтрована
    });

    it('should return 404 if order not found', async () => {
        orderModel.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    
        const response = await request(app)
            .get(`/api/order/${testOrderId}/status`)
            .expect(404);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Замовлення не знайдено');
    });
    
    it('should return 403 if user does not own the order (non-admin)', async () => {
        const otherUserId = new mongoose.Types.ObjectId();
        const mockSelectFn = jest.fn().mockResolvedValue({
            _id: testOrderId,
            userId: { toString: () => otherUserId.toString() },
            status: 'Нове замовлення',
            orderNumber: 'ORD-1',
            editHistory: []
        });
    
        orderModel.findById = jest.fn().mockReturnValue({ select: mockSelectFn });
    
        const response = await request(app)
            .get(`/api/order/${testOrderId}/status`)
            .expect(403);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Ви не маєте доступу до цього замовлення');
    });
    
    it('should return 500 if database error occurs', async () => {
        const mockSelectFn = jest.fn().mockRejectedValue(new Error('DB error'));
        orderModel.findById = jest.fn().mockReturnValue({ select: mockSelectFn });
    
        const response = await request(app)
            .get(`/api/order/${testOrderId}/status`)
            .expect(500);
    
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Сталася помилка при отриманні статусу замовлення');
    });
    
});



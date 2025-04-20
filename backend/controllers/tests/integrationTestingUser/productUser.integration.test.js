import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import productRouter from '../../../routes/productRoute.js'; // Шлях до вашого роутера товарів
import productModel from '../../../models/productModel.js';

// ----- Мокуємо Залежності -----
// Мокуємо модель productModel
jest.mock("../../../models/productModel.js");

// ----- Налаштування Тестового Додатку Express -----
const app = express();
app.use(express.json()); // Для парсингу JSON
app.use('/api/product', productRouter); // Монтуємо роутер товарів

// ----- Допоміжна функція для створення ObjectId -----
const createObjectId = () => new mongoose.Types.ObjectId().toString();

// ===== Тести для Користувацьких Ендпоінтів Продуктів =====

describe('Product API - User Endpoints', () => {

    // Скидаємо моки перед кожним тестом
    beforeEach(() => {
        jest.clearAllMocks();
        // Мокуємо console.log/error для перевірки логування, якщо потрібно
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    // Відновлюємо моки після тестів
    afterEach(() => {
         console.log.mockRestore();
         console.error.mockRestore();
    });

    // --- Тести для GET /api/product/list-product ---
    describe('GET /api/product/list-product', () => {
        it('should return a list of all products with calculated discountedPrice', async () => {
            const mockProducts = [
                { _id: createObjectId(), name: 'Product 1', price: 100, discount: 10, toObject: function() { return this; } }, // 10% знижка -> 90
                { _id: createObjectId(), name: 'Product 2', price: 200, discount: 0, toObject: function() { return this; } }, // Без знижки -> 200
                { _id: createObjectId(), name: 'Product 3', price: 50, discount: 20, toObject: function() { return this; } }, // 20% знижка -> 40
            ];
            productModel.find.mockResolvedValue(mockProducts);

            const response = await request(app)
                .get('/api/product/list-product')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(productModel.find).toHaveBeenCalledWith({});
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].name).toBe('Product 1');
            expect(response.body.data[0].discountedPrice).toBe(90);
            expect(response.body.data[1].name).toBe('Product 2');
            expect(response.body.data[1].discountedPrice).toBe(200);
             expect(response.body.data[2].name).toBe('Product 3');
            expect(response.body.data[2].discountedPrice).toBe(40);
        });

        it('should return an empty list if no products exist', async () => {
            productModel.find.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/product/list-product')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        it('should return an error message if database query fails', async () => {
            const dbError = new Error('Database failed');
            productModel.find.mockRejectedValue(dbError);

            const response = await request(app)
                .get('/api/product/list-product')
                .expect(200); // Контролер повертає 200 при помилці

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка");
            expect(console.log).toHaveBeenCalledWith(dbError);
        });
    });

    // --- Тести для GET /api/product/details/:id ---
    describe('GET /api/product/details/:id', () => {
        const testProductId = createObjectId();
        const mockProduct = { _id: testProductId, name: 'Specific Product', price: 150 };

        it('should return the details of a specific product', async () => {
            productModel.findById.mockResolvedValue(mockProduct);

            const response = await request(app)
                .get(`/api/product/details/${testProductId}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(productModel.findById).toHaveBeenCalledWith(testProductId);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockProduct);
        });

        it('should return 404 (implicitly via message) if product not found', async () => {
            productModel.findById.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/product/details/${testProductId}`)
                .expect(200); // Контролер повертає 200

            expect(productModel.findById).toHaveBeenCalledWith(testProductId);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Товар не знайдено");
        });

         it('should return an error if product ID is invalid', async () => {
            const invalidId = 'invalid-id-format';
             const castError = new mongoose.Error.CastError('ObjectId', invalidId, 'id');
             productModel.findById.mockRejectedValue(castError); // Мокуємо помилку кастування

             const response = await request(app)
                .get(`/api/product/details/${invalidId}`)
                .expect(200); // Контролер повертає 200 при помилці

            expect(productModel.findById).toHaveBeenCalledWith(invalidId);
             expect(response.body.success).toBe(false);
             expect(response.body.message).toBe("Помилка при отриманні товару");
             expect(console.log).toHaveBeenCalledWith(castError);
         });

        it('should return an error message if database query fails', async () => {
            const dbError = new Error('DB lookup failed');
            productModel.findById.mockRejectedValue(dbError);

            const response = await request(app)
                .get(`/api/product/details/${testProductId}`)
                .expect(200); // Контролер повертає 200

            expect(productModel.findById).toHaveBeenCalledWith(testProductId);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка при отриманні товару");
            expect(console.log).toHaveBeenCalledWith(dbError);
        });
    });

    // --- Тести для GET /api/product/search?q=... ---
    describe('GET /api/product/search', () => {
         const mockSearchResults = [
             { _id: createObjectId(), name: 'Test Search Result 1', description: 'Contains test' },
             { _id: createObjectId(), name: 'Another Test Item', description: 'Different description' },
         ];

         it('should return products matching the search query in name or description', async () => {
            const searchQuery = 'test';
             // Мокуємо метод find з правильними опціями
            productModel.find.mockReturnValue({
                 limit: jest.fn().mockResolvedValue(mockSearchResults) // Мокуємо find і наступний limit
             });

             const response = await request(app)
                 .get(`/api/product/search?q=${searchQuery}`)
                 .expect('Content-Type', /json/)
                 .expect(200);

             expect(productModel.find).toHaveBeenCalledWith({
                 $or: [
                     { name: { $regex: searchQuery, $options: 'i' } },
                     { description: { $regex: searchQuery, $options: 'i' } }
                 ]
             });
            expect(productModel.find().limit).toHaveBeenCalledWith(10); // Перевіряємо ліміт
             expect(response.body).toEqual(mockSearchResults);
         });

         it('should return 400 if query parameter "q" is missing', async () => {
             const response = await request(app)
                 .get('/api/product/search') // Без ?q=...
                 .expect('Content-Type', /json/)
                 .expect(400);

             expect(response.body.message).toBe('Query parameter is required');
            expect(productModel.find).not.toHaveBeenCalled(); // Переконуємось, що пошук не викликався
         });

        it('should return 500 if database query fails', async () => {
             const dbError = new Error('Search failed');
            productModel.find.mockReturnValue({
                 limit: jest.fn().mockRejectedValue(dbError)
             });

             const response = await request(app)
                 .get('/api/product/search?q=anything')
                 .expect('Content-Type', /json/)
                 .expect(500);

             expect(response.body.message).toBe('Server error');
             expect(console.error).toHaveBeenCalledWith(dbError);
         });
    });

    // --- Тести для GET /api/product/list-discounted-products ---
    describe('GET /api/product/list-discounted-products', () => {
        it('should return only products with discount > 0, including discountedPrice', async () => {
            const mockDiscountedProducts = [
                { _id: createObjectId(), name: 'Discounted 1', price: 100, discount: 15, toObject: function() { return this; } }, // -> 85
                { _id: createObjectId(), name: 'Discounted 2', price: 300, discount: 5, toObject: function() { return this; } }, // -> 285
            ];
            // Важливо: Мокуємо find з правильним фільтром
            productModel.find.mockResolvedValue(mockDiscountedProducts);

            const response = await request(app)
                .get('/api/product/list-discounted-products')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(productModel.find).toHaveBeenCalledWith({ discount: { $gt: 0 } });
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].name).toBe('Discounted 1');
            expect(response.body.data[0].discountedPrice).toBe(85);
             expect(response.body.data[1].name).toBe('Discounted 2');
            expect(response.body.data[1].discountedPrice).toBe(285);
        });

         it('should return an empty list if no discounted products exist', async () => {
            productModel.find.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/product/list-discounted-products')
                .expect(200);

             expect(productModel.find).toHaveBeenCalledWith({ discount: { $gt: 0 } });
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

         it('should return an error message if database query fails', async () => {
            const dbError = new Error('Failed discounted search');
            productModel.find.mockRejectedValue(dbError);

            const response = await request(app)
                .get('/api/product/list-discounted-products')
                .expect(200); // Контролер повертає 200

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка при отриманні товарів зі знижкою");
            expect(console.log).toHaveBeenCalledWith(dbError);
        });
    });

    // --- Тести для GET /api/product/availability/:id ---
    describe('GET /api/product/availability/:id', () => {
        const testProductId = createObjectId();

        it('should return availability for a product with sizes', async () => {
             const mockProductWithSizes = {
                _id: testProductId,
                name: 'Product With Sizes',
                sizes: [
                    { size: 'S', quantity: 5 },
                    { size: 'M', quantity: 0 },
                    { size: 'L', quantity: 10 },
                ]
            };
            productModel.findById.mockResolvedValue(mockProductWithSizes);

            const response = await request(app)
                .get(`/api/product/availability/${testProductId}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(productModel.findById).toHaveBeenCalledWith(testProductId);
            expect(response.body.success).toBe(true);
            expect(response.body.data.productId).toBe(testProductId);
            expect(response.body.data.name).toBe('Product With Sizes');
            expect(response.body.data.available).toBe(true); // Доступний, бо є S і L
            expect(response.body.data.details.sizes).toEqual([
                { size: 'S', available: true, quantity: 5 },
                { size: 'M', available: false, quantity: 0 },
                { size: 'L', available: true, quantity: 10 },
            ]);
        });

         it('should return availability for a product without sizes (available)', async () => {
             const mockProductNoSizes = {
                _id: testProductId,
                name: 'Product No Sizes',
                quantity: 3 // Припустимо, що є загальна кількість для товарів без розмірів
            };
             productModel.findById.mockResolvedValue(mockProductNoSizes);

             const response = await request(app)
                 .get(`/api/product/availability/${testProductId}`)
                 .expect(200);

             expect(response.body.success).toBe(true);
             expect(response.body.data.available).toBe(true);
             expect(response.body.data.details.quantity).toBe(3);
             expect(response.body.data.details.sizes).toBeUndefined();
         });

         it('should return availability for a product without sizes (unavailable)', async () => {
             const mockProductNoSizesUnavailable = {
                 _id: testProductId,
                 name: 'Product No Sizes Unavailable',
                 quantity: 0 // Немає в наявності
             };
             productModel.findById.mockResolvedValue(mockProductNoSizesUnavailable);

             const response = await request(app)
                 .get(`/api/product/availability/${testProductId}`)
                 .expect(200);

             expect(response.body.success).toBe(true);
             expect(response.body.data.available).toBe(false);
             expect(response.body.data.details.quantity).toBe(0);
         });

        it('should return 404 if product not found for availability check', async () => {
            productModel.findById.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/product/availability/${testProductId}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(productModel.findById).toHaveBeenCalledWith(testProductId);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Товар не знайдено");
        });

        it('should return 500 if database query fails during availability check', async () => {
            const dbError = new Error('Availability check failed');
            productModel.findById.mockRejectedValue(dbError);

            const response = await request(app)
                .get(`/api/product/availability/${testProductId}`)
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Помилка при перевірці наявності товару");
            expect(response.body.error).toBe(dbError.message);
            expect(console.error).toHaveBeenCalledWith(dbError);
        });

        it('should return 500 if product ID is invalid for availability check', async () => {
            const invalidId = 'bad-id';
            const castError = new mongoose.Error.CastError('ObjectId', invalidId, 'id');
             productModel.findById.mockRejectedValue(castError);

             const response = await request(app)
                .get(`/api/product/availability/${invalidId}`)
                .expect(500);

            expect(productModel.findById).toHaveBeenCalledWith(invalidId);
            expect(response.body.success).toBe(false);
             expect(response.body.message).toContain("Помилка при перевірці наявності товару");
             expect(console.error).toHaveBeenCalledWith(castError);
         });
    });

});
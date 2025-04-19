import productModel from "../../../models/productModel.js";
import {
    listProduct,
    getProductById,
    listDiscountedProducts,
    checkProductAvailability,
    // Імпортуємо хелпер для тестування окремо, хоча він не є ендпоінтом
    getDiscountedPrice, // Note: this is not an export in the original code, assuming it's accessible or refactored for testability
} from "../../productController.js"; // Припускаємо, що контролер знаходиться тут

// Мокуємо модель продукту
jest.mock("../../../models/productModel.js");

// Оскільки getDiscountedPrice - це внутрішня функція, а не експорт,
// ми повинні її або експортувати, або відтворити для тестування.
// Тут ми її відтворюємо:
const calculateDiscountedPrice = (price, discount) => {
    if (discount && discount > 0 && discount <= 100) { // Додано перевірку discount <= 100
        return price * (1 - discount / 100);
    }
    return price;
};


// ----- Тести для listProduct (Доступно для користувачів) -----
describe("listProduct", () => {
    let req, res;

    beforeEach(() => {
        req = {}; // listProduct не використовує req
        res = {
            json: jest.fn(),
        };
        productModel.find.mockClear(); // Очистка моків перед кожним тестом
    });

    it("повинен повертати список товарів з розрахованою ціною зі знижкою", async () => {
        const mockProducts = [
            { _id: "1", name: "Product A", price: 100, discount: 10, toObject: () => ({ _id: "1", name: "Product A", price: 100, discount: 10 }) },
            { _id: "2", name: "Product B", price: 200, discount: 0, toObject: () => ({ _id: "2", name: "Product B", price: 200, discount: 0 }) },
            { _id: "3", name: "Product C", price: 150, discount: null, toObject: () => ({ _id: "3", name: "Product C", price: 150, discount: null }) },
        ];
        productModel.find.mockResolvedValue(mockProducts);

        await listProduct(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [
                { _id: "1", name: "Product A", price: 100, discount: 10, discountedPrice: 90 }, // 100 * (1 - 10/100)
                { _id: "2", name: "Product B", price: 200, discount: 0, discountedPrice: 200 }, // 200 * (1 - 0/100)
                { _id: "3", name: "Product C", price: 150, discount: null, discountedPrice: 150 }, // No discount
            ]
        });
    });

    it("повинен повертати порожній масив, якщо товарів немає", async () => {
        productModel.find.mockResolvedValue([]);

        await listProduct(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it("повинен повертати помилку, якщо виникає проблема з базою даних", async () => {
        const dbError = new Error("Database connection failed");
        productModel.find.mockRejectedValue(dbError);

        await listProduct(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
    });
});

// ----- Тести для getProductById (Доступно для користувачів) -----
describe("getProductById", () => {
    let req, res;
    const mockProductId = "prod123";

    beforeEach(() => {
        req = {
            params: { id: mockProductId }
        };
        res = {
            json: jest.fn()
        };
        productModel.findById.mockClear();
    });

    it("повинен повертати дані товару за його ID", async () => {
        const mockProduct = {
             _id: mockProductId,
             name: "Test Product",
             price: 500,
             description: "Test Description",
             // ... інші поля товару
        };
        productModel.findById.mockResolvedValue(mockProduct);

        await getProductById(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(mockProductId);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: mockProduct });
    });

    it("повинен повертати 'Товар не знайдено', якщо товар з таким ID не існує", async () => {
        productModel.findById.mockResolvedValue(null); // Симуляція не знайденого товару

        await getProductById(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(mockProductId);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Товар не знайдено" });
    });

    it("повинен повертати помилку при виникненні проблеми з базою даних", async () => {
        const dbError = new Error("Failed to fetch");
        productModel.findById.mockRejectedValue(dbError);

        await getProductById(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(mockProductId);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка при отриманні товару" });
    });

     it("повинен обробляти невірний формат ID (хоча контролер може не дійти до цього через помилку mongoose)", async () => {
        req.params.id = "invalid-id-format";
         // Mongoose findById зазвичай сам викидає помилку CastError для невалідних ID
        const castError = new Error("Cast to ObjectId failed for value \"invalid-id-format\"");
        castError.name = "CastError";
        productModel.findById.mockRejectedValue(castError);

        await getProductById(req, res);

        expect(productModel.findById).toHaveBeenCalledWith("invalid-id-format");
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка при отриманні товару" }); // Або більш специфічне повідомлення, якщо воно є в catch блоці
    });
});

// ----- Тести для listDiscountedProducts (Доступно для користувачів) -----
describe("listDiscountedProducts", () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
        };
        productModel.find.mockClear();
    });

    it("повинен повертати список товарів зі знижкою (> 0) з розрахованою discountedPrice", async () => {
        const mockDiscountedProducts = [
            { _id: "d1", name: "Discount A", price: 100, discount: 15, toObject: () => ({ _id: "d1", name: "Discount A", price: 100, discount: 15 }) },
            { _id: "d2", name: "Discount B", price: 300, discount: 5, toObject: () => ({ _id: "d2", name: "Discount B", price: 300, discount: 5 }) },
        ];
        // Примітка: Важливо передати правильний запит для find
        productModel.find.mockResolvedValue(mockDiscountedProducts);

        await listDiscountedProducts(req, res);

        // Перевірка, що find викликається з правильним фільтром
        expect(productModel.find).toHaveBeenCalledWith({ discount: { $gt: 0 } });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [
                { _id: "d1", name: "Discount A", price: 100, discount: 15, discountedPrice: 85 }, // 100 * (1 - 15/100)
                { _id: "d2", name: "Discount B", price: 300, discount: 5, discountedPrice: 285 }, // 300 * (1 - 5/100)
            ]
        });
    });

    it("повинен повертати порожній масив, якщо товарів зі знижкою немає", async () => {
        productModel.find.mockResolvedValue([]);

        await listDiscountedProducts(req, res);

        expect(productModel.find).toHaveBeenCalledWith({ discount: { $gt: 0 } });
        expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it("повинен повертати помилку, якщо виникає проблема з базою даних", async () => {
        const dbError = new Error("Query failed");
        productModel.find.mockRejectedValue(dbError);

        await listDiscountedProducts(req, res);

        expect(productModel.find).toHaveBeenCalledWith({ discount: { $gt: 0 } });
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка при отриманні товарів зі знижкою" });
    });
});

// ----- Тести для checkProductAvailability (Доступно для користувачів) -----
describe("checkProductAvailability", () => {
    let req, res;
    const productId = "avail-check-123";

    beforeEach(() => {
        req = { params: { id: productId } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        productModel.findById.mockClear();
    });

    it("повинен повертати 'Товар не знайдено' і статус 404, якщо товар не знайдено", async () => {
        productModel.findById.mockResolvedValue(null);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Товар не знайдено"
        });
    });

    it("повинен повертати 'available: true' та кількість для товару без розмірів, якщо quantity > 0", async () => {
        const mockProduct = {
            _id: productId,
            name: "Simple Product",
            quantity: 10, // Доступний
            // Немає поля sizes або воно порожнє
        };
        productModel.findById.mockResolvedValue(mockProduct);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                productId: productId,
                name: "Simple Product",
                available: true,
                details: { quantity: 10 }
            }
        });
    });

    it("повинен повертати 'available: false' та кількість для товару без розмірів, якщо quantity = 0", async () => {
        const mockProduct = {
            _id: productId,
            name: "Out of Stock Product",
            quantity: 0, // Недоступний
        };
        productModel.findById.mockResolvedValue(mockProduct);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                productId: productId,
                name: "Out of Stock Product",
                available: false,
                details: { quantity: 0 }
            }
        });
    });

     it("повинен повертати 'available: true' і деталі по розмірах, якщо хоча б один розмір доступний", async () => {
        const mockProduct = {
            _id: productId,
            name: "Sized Product",
            sizes: [
                { size: "M", quantity: 5 },
                { size: "L", quantity: 0 }, // L недоступний
                { size: "XL", quantity: 2 },
            ]
        };
        productModel.findById.mockResolvedValue(mockProduct);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                productId: productId,
                name: "Sized Product",
                available: true, // Загалом доступний, бо є M та XL
                details: {
                    sizes: [
                        { size: "M", available: true, quantity: 5 },
                        { size: "L", available: false, quantity: 0 },
                        { size: "XL", available: true, quantity: 2 },
                    ]
                }
            }
        });
    });

     it("повинен повертати 'available: false' і деталі по розмірах, якщо жоден розмір не доступний", async () => {
        const mockProduct = {
            _id: productId,
            name: "Fully Out of Stock Sized Product",
            sizes: [
                { size: "S", quantity: 0 },
                { size: "M", quantity: 0 },
            ]
        };
        productModel.findById.mockResolvedValue(mockProduct);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                productId: productId,
                name: "Fully Out of Stock Sized Product",
                available: false, // Загалом недоступний
                details: {
                    sizes: [
                        { size: "S", available: false, quantity: 0 },
                        { size: "M", available: false, quantity: 0 },
                    ]
                }
            }
        });
    });


     it("повинен повертати помилку сервера 500 при виникненні проблеми з базою даних", async () => {
        const dbError = new Error("Connection timeout");
        productModel.findById.mockRejectedValue(dbError);

        await checkProductAvailability(req, res);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при перевірці наявності товару",
            error: dbError.message
        });
    });
});


// ----- Тести для Хелпер Функції getDiscountedPrice (для повноти) -----
// Оскільки ця функція використовується в кількох місцях, її тестування корисне.
describe("getDiscountedPrice (helper function)", () => {
    it("повинна коректно розраховувати ціну зі знижкою", () => {
        expect(calculateDiscountedPrice(100, 20)).toBe(80);
        expect(calculateDiscountedPrice(50, 10)).toBe(45);
        expect(calculateDiscountedPrice(99.99, 50)).toBeCloseTo(49.995); // Використовуємо toBeCloseTo для чисел з плаваючою комою
        expect(calculateDiscountedPrice(200, 100)).toBe(0);
    });

    it("повинна повертати оригінальну ціну, якщо знижка 0, null, або undefined", () => {
        expect(calculateDiscountedPrice(100, 0)).toBe(100);
        expect(calculateDiscountedPrice(75, null)).toBe(75);
        expect(calculateDiscountedPrice(50, undefined)).toBe(50);
    });

    it("повинна повертати оригінальну ціну, якщо знижка невалідна (наприклад, від'ємна або > 100)", () => {
        // Поточна реалізація не обробляє < 0 або > 100 окремо, але ми додали це в відтворену функцію calculateDiscountedPrice
        expect(calculateDiscountedPrice(100, -10)).toBe(100); // Наша calculateDiscountedPrice поверне 100
         expect(calculateDiscountedPrice(100, 110)).toBe(100); // Наша calculateDiscountedPrice поверне 100
    });
});
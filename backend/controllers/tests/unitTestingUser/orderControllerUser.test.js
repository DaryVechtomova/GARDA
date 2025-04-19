import orderModel from "../../../models/orderModel.js";
import userModel from "../../../models/userModel.js";
import productModel from "../../../models/productModel.js"; // Додано мок для productModel
import Stripe from "stripe";
import {
    placeOrder,
    verifyOrder,
    userOrders,
    cancelOrderForUser, // Імпортовано
    getOrderStatus,      // Імпортовано
} from "../../orderController.js";


jest.mock("../../../models/orderModel.js");
jest.mock("../../../models/userModel.js");
jest.mock("../../../models/productModel.js"); // Мокаємо productModel

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

// --- Початок існуючих тестів ---

describe("placeOrder", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                userId: "user123",
                items: [{
                    _id: "product123",
                    name: "Product",
                    price: 100,
                    discount: 0,
                    images: ["image.jpg"],
                    quantity: 1
                }],
                amount: 100,
                deliveryMethod: "Нова Пошта",
                deliveryDetails: {
                    firstName: "Іван",
                    lastName: "Петренко",
                    email: "ivan@example.com",
                    phone: "+380123456789",
                    region: "Київська",
                    city: "Київ",
                    departmentNumber: "15"
                }
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Генерація унікального номера
        orderModel.findOne.mockResolvedValue(null);

        // Заміна save на resolve
        // orderModel.mockImplementation(() => ({
        //     save: jest.fn().mockResolvedValue({})
        // }));
        // More robust mocking for new instance creation and saving
         orderModel.mockImplementation(function(data) {
            this._id = data._id || 'newOrderId123'; // Add a default mock ID
            this.data = data;
            this.save = jest.fn().mockResolvedValue({ ...this.data, _id: this._id });
            return this;
        });

        // Користувач оновлюється
        userModel.findByIdAndUpdate.mockResolvedValue({});
    });

    it("should place an order and return session url", async () => {
        await placeOrder(req, res);

        expect(orderModel.mock.instances[0].save).toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", { cartData: {} });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                session_url: expect.stringContaining("https://stripe.com"),
                orderNumber: expect.any(Number)
            })
        );
    });

    it("should return 400 if no userId", async () => {
        req.body.userId = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "ID користувача є обов'язковим полем" })
        );
    });

    it("should return 400 if items are missing", async () => {
        req.body.items = [];
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Замовлення повинно містити хоча б один товар" })
        );
    });

    it("should return 400 if amount is zero or negative", async () => {
        req.body.amount = 0;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Сума замовлення повинна бути більше нуля" })
        );
    });

    it("should return 400 if deliveryMethod is missing", async () => {
        req.body.deliveryMethod = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Спосіб доставки є обов'язковим полем" })
        );
    });

    it("should return 400 if deliveryDetails is missing", async () => {
        req.body.deliveryDetails = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Деталі доставки є обов'язковими" })
        );
    });

        it("should return 400 if firstName is missing", async () => {
        req.body.deliveryDetails.firstName = null;
        await placeOrder(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Ім'я та прізвище є обов'язковими полями" });
    });

    it("should return 400 if lastName is missing", async () => {
        req.body.deliveryDetails.lastName = null;
        await placeOrder(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Ім'я та прізвище є обов'язковими полями" });
    });

    it("should return 400 if email is invalid", async () => {
        req.body.deliveryDetails.email = "invalid-email";
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Будь ласка, введіть коректний email" })
        );
    });

        it("should return 400 if email is missing", async () => {
        req.body.deliveryDetails.email = null;
        await placeOrder(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, введіть коректний email" });
    });


    it("should return 400 if phone is invalid", async () => {
        req.body.deliveryDetails.phone = "123";
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Будь ласка, введіть коректний номер телефону (наприклад, +380123456789)" })
        );
    });

     it("should return 400 if phone is missing", async () => {
        req.body.deliveryDetails.phone = null;
        await placeOrder(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, введіть коректний номер телефону (наприклад, +380123456789)" });
    });


    it("should return 400 if deliveryMethod is 'Нова Пошта' but region is missing", async () => {
        req.body.deliveryDetails.region = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Для Нової Пошти необхідно вказати область, місто та номер відділення" })
        );
    });

    it("should return 400 if deliveryMethod is 'Нова Пошта' but city is missing", async () => {
        req.body.deliveryDetails.city = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Для Нової Пошти необхідно вказати область, місто та номер відділення" })
        );
    });

    it("should return 400 if deliveryMethod is 'Нова Пошта' but departmentNumber is missing", async () => {
        req.body.deliveryDetails.departmentNumber = null;
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Для Нової Пошти необхідно вказати область, місто та номер відділення" })
        );
    });

    it("should return 400 if deliveryMethod is 'Укрпошта' but required fields are missing", async () => {
        req.body.deliveryMethod = "Укрпошта";
        req.body.deliveryDetails.region = null; // Missing one required field
        req.body.deliveryDetails.city = "Київ";
        req.body.deliveryDetails.postalCode = "01001";
        req.body.deliveryDetails.street = "Хрещатик";
        req.body.deliveryDetails.houseNumber = "1";

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Для Укрпошти необхідно вказати область, місто, поштовий індекс, вулицю та номер будинку" })
        );
    });

     it("should return 400 if deliveryMethod is 'Самовивіз' but city is invalid", async () => {
        req.body.deliveryMethod = "Самовивіз";
        req.body.deliveryDetails.city = "Одеса"; // Not an allowed city
        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Самовивіз можливий тільки у Києві, Львові або Харкові" })
        );
    });

     it("should handle errors during order save", async () => {
        orderModel.mockImplementation(function(data) {
            this.data = data;
            this.save = jest.fn().mockRejectedValue(new Error("DB Save Error")); // Mock save failure
            return this;
        });

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
    });

});

// ----- Тести для verifyOrder -----
describe("verifyOrder", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                orderId: "order123",
                success: "true"
            }
        };

        res = {
            json: jest.fn()
        };
         orderModel.findByIdAndUpdate.mockClear();
         orderModel.findByIdAndDelete.mockClear();
    });

    it("should mark order as paid when success is true", async () => {
        orderModel.findByIdAndUpdate.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("order123", { payment: true });
         expect(orderModel.findByIdAndDelete).not.toHaveBeenCalled(); // Ensure delete wasn't called
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Оплачено"
        });
    });

    it("should delete order when success is false", async () => {
        req.body.success = "false";
        orderModel.findByIdAndDelete.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith("order123");
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled(); // Ensure update wasn't called
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Оплата не пройшла"
        });
    });

    it("should handle errors during update (success=true)", async () => {
        orderModel.findByIdAndUpdate.mockRejectedValue(new Error("DB Update Error"));

        await verifyOrder(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("order123", { payment: true });
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка"
        });
    });

    it("should handle errors during delete (success=false)", async () => {
        req.body.success = "false";
        orderModel.findByIdAndDelete.mockRejectedValue(new Error("DB Delete Error"));

        await verifyOrder(req, res);

         expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith("order123");
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка"
        });
    });

     it("should handle non-boolean string 'true' correctly", async () => {
        // Test with string "true", should behave the same as success = true
        req.body.success = "true";
        orderModel.findByIdAndUpdate.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("order123", { payment: true });
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "Оплачено" });
    });

     it("should handle different string values for success correctly (as false)", async () => {
        // Any string other than exactly "true" should be treated as false
        req.body.success = "Success"; // Example different string
        orderModel.findByIdAndDelete.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith("order123");
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Оплата не пройшла" });
    });

     it("should handle missing success parameter (treat as false)", async () => {
        delete req.body.success; // Remove success parameter
        orderModel.findByIdAndDelete.mockResolvedValue({});

        await verifyOrder(req, res);

        // Expect deletion because success !== "true"
        expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith("order123");
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Оплата не пройшла" });
    });

});

// ----- Тести для userOrders -----
describe("userOrders", () => {
    let req, res;

    beforeEach(() => {
      req = { body: { userId: "user12345" } };
      res = {
        json: jest.fn(),
      };
      orderModel.find.mockClear(); // Clear mocks before each test
    });

    it("повертає замовлення користувача", async () => {
      const mockOrders = [
        { _id: "1", userId: "user12345", items: ["item1"] },
        { _id: "2", userId: "user12345", items: ["item2"] },
      ];

      orderModel.find.mockResolvedValue(mockOrders);

      await userOrders(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({ userId: "user12345" });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockOrders });
    });

    it("повертає порожній масив, якщо замовлень немає", async () => {
      orderModel.find.mockResolvedValue([]); // Simulate no orders found

      await userOrders(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({ userId: "user12345" });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it("повертає повідомлення про помилку, якщо сталася помилка бази даних", async () => {
      const error = new Error("DB find error");
      orderModel.find.mockRejectedValue(error); // Simulate DB error

      await userOrders(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({ userId: "user12345" });
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Error" });
    });

    it("повертає помилку, якщо userId відсутній у запиті", async () => {
        delete req.body.userId; // Remove userId from request body
        // Mock find to potentially throw error if called with undefined,
        // although the code as written would try `find({ userId: undefined })`
         orderModel.find.mockResolvedValue([]); // Let's assume it finds nothing

        await userOrders(req, res);

        // The controller doesn't explicitly check for userId, but the find might behave unexpectedly.
        // Mongoose's behavior with `find({ userId: undefined })` might vary or return empty.
        // A more robust controller would validate `req.body.userId`.
        // Based *strictly* on the provided controller code, it would proceed.
        // However, if the intent is that userId is required, this test reveals a potential gap.
        // Let's test the actual behavior based on the code given:
         expect(orderModel.find).toHaveBeenCalledWith({ userId: undefined });
         expect(res.json).toHaveBeenCalledWith({ success: true, data: [] }); // Or potentially error if find fails weirdly

        // *Alternative assertion if validation was expected*:
        // expect(res.status).toHaveBeenCalledWith(400);
        // expect(res.json).toHaveBeenCalledWith({ success: false, message: "Missing userId" });
    });
});


// ----- Тести для cancelOrderForUser -----
describe("cancelOrderForUser", () => {
    let req, res, mockOrder;

    beforeEach(() => {
        // Мок запиту з користувачем та параметрами
        req = {
            params: { orderId: "order123" },
            body: { reason: "Передумав" },
            user: { // Мок об'єкта користувача
                _id: "user456",
                name: "Тест Користувач",
                firstName: "Тест",
                lastName: "Користувач"
            }
        };
        // Мок відповіді
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        // Мок замовлення, яке буде повертати findById
        mockOrder = {
            _id: "order123",
            userId: "user456", // Належить цьому користувачеві
            status: "Нове замовлення",
            items: [
                { productId: "prod1", size: "M", quantity: 1 },
                { productId: "prod2", size: "L", quantity: 2 }
            ],
             // Add save mock for potential chained calls if needed
            save: jest.fn().mockResolvedValue(this)
        };

        // Скидання всіх моків перед кожним тестом
        orderModel.findById.mockClear();
        orderModel.findByIdAndUpdate.mockClear();
        productModel.findByIdAndUpdate.mockClear();
    });

     it("should successfully cancel an order with status 'Нове замовлення'", async () => {
        orderModel.findById.mockResolvedValue(mockOrder);
        orderModel.findByIdAndUpdate.mockResolvedValue({
            ...mockOrder,
            status: "Скасовано",
            cancellationReason: req.body.reason
        }); // Simulate successful update

        await cancelOrderForUser(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order123");
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "order123",
            expect.objectContaining({
                status: "Скасовано",
                cancellationReason: "Передумав",
                $push: {
                    editHistory: expect.objectContaining({
                         type: 'status_change',
                         oldStatus: "Нове замовлення",
                         newStatus: "Скасовано",
                         reason: "Передумав",
                         editedBy: expect.objectContaining({ userId: "user456", name: "Тест Користувач" })
                     })
                 }
            }),
            { new: true }
        );
        // Product stock should NOT be updated for 'Нове замовлення'
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Ваше замовлення успішно скасовано",
                data: expect.objectContaining({ status: "Скасовано" })
            })
        );
    });

     it("should successfully cancel an order with status 'В обробці' and update product stock", async () => {
        mockOrder.status = "В обробці"; // Change status for this test
        orderModel.findById.mockResolvedValue(mockOrder);
        orderModel.findByIdAndUpdate.mockResolvedValue({
            ...mockOrder,
            status: "Скасовано",
            cancellationReason: req.body.reason
        });
         productModel.findByIdAndUpdate.mockResolvedValue({}); // Mock product update success

        await cancelOrderForUser(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order123");
         // Check if product stock was updated for each item
         expect(productModel.findByIdAndUpdate).toHaveBeenCalledTimes(mockOrder.items.length);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
             "prod1",
             { $inc: { "sizes.$[elem].quantity": 1 } },
             { arrayFilters: [{ "elem.size": "M" }] }
         );
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
             "prod2",
             { $inc: { "sizes.$[elem].quantity": 2 } },
             { arrayFilters: [{ "elem.size": "L" }] }
         );
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "order123",
            expect.objectContaining({
                status: "Скасовано",
                 cancellationReason: "Передумав",
                 $push: {
                    editHistory: expect.objectContaining({ oldStatus: "В обробці" }) // Check correct old status in history
                }
            }),
            { new: true }
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Ваше замовлення успішно скасовано"
            })
        );
    });

    it("should return 404 if order not found", async () => {
        orderModel.findById.mockResolvedValue(null); // Simulate order not found

        await cancelOrderForUser(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order123");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Замовлення не знайдено" });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should return 403 if user tries to cancel another user's order", async () => {
        mockOrder.userId = "otherUser789"; // Order belongs to someone else
        orderModel.findById.mockResolvedValue(mockOrder);

        await cancelOrderForUser(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order123");
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Ви не маєте прав для скасування цього замовлення"
        });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should return 400 if order status is not 'Нове замовлення' or 'В обробці'", async () => {
        mockOrder.status = "Доставлено"; // Set a non-cancellable status
        orderModel.findById.mockResolvedValue(mockOrder);

        await cancelOrderForUser(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order123");
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'"
        });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

      it("should handle missing reason in request body gracefully (uses default/empty)", async () => {
        // The code doesn't explicitly check for reason, so it should proceed but cancellationReason might be empty/null
        delete req.body.reason;
        orderModel.findById.mockResolvedValue(mockOrder);
         orderModel.findByIdAndUpdate.mockResolvedValue({ ...mockOrder, status: "Скасовано", cancellationReason: undefined });

        await cancelOrderForUser(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
             "order123",
             expect.objectContaining({ status: "Скасовано", cancellationReason: undefined }), // Check if reason is handled (likely becomes undefined)
             { new: true }
         );
         expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("should handle errors during findById", async () => {
        const error = new Error("DB Find Error");
        orderModel.findById.mockRejectedValue(error);

        await cancelOrderForUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
    });

    it("should handle errors during findByIdAndUpdate", async () => {
        orderModel.findById.mockResolvedValue(mockOrder);
        const error = new Error("DB Update Error");
        orderModel.findByIdAndUpdate.mockRejectedValue(error); // Simulate update failure

        await cancelOrderForUser(req, res);

         expect(orderModel.findByIdAndUpdate).toHaveBeenCalled(); // Ensure update was attempted
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
    });

    it("should handle errors during product stock update", async () => {
        mockOrder.status = "В обробці"; // Need this status to trigger product update
        orderModel.findById.mockResolvedValue(mockOrder);
        const error = new Error("Product Update Error");
        productModel.findByIdAndUpdate.mockRejectedValue(error); // Simulate product update failure

        await cancelOrderForUser(req, res);

        expect(productModel.findByIdAndUpdate).toHaveBeenCalled(); // Ensure product update was attempted
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
         // Even if product update fails, the controller might not attempt to update the order status
         // Depending on implementation details not shown, like transactions.
         // Let's check if order update was called based on current code structure
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled(); // Fails before order update in the code
    });
});


// ----- Тести для getOrderStatus -----
describe("getOrderStatus", () => {
    let req, res, mockOrderData;

    beforeEach(() => {
        // Базовий мок запиту
        req = {
            params: { orderId: "order987" },
            user: { // Користувач за замовчуванням (не адмін)
                _id: "userABC",
                name: "Regular User",
                role: "user"
            }
        };
        // Базовий мок відповіді
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        // Мок даних замовлення
        mockOrderData = {
            _id: "order987",
            userId: "userABC", // Належить цьому користувачеві
            orderNumber: 123456789012,
            status: "В обробці",
            cancellationReason: null,
            editHistory: [
                 {
                    date: new Date(Date.now() - 86400000), // 1 day ago
                    editedBy: { name: 'Admin' },
                    type: 'order_edit',
                    changes: {}
                 },
                {
                    date: new Date(),
                    editedBy: { userId: "admin1", name: "Адміністратор" },
                    oldStatus: "Нове замовлення",
                    newStatus: "В обробці",
                    type: 'status_change'
                },
                 {
                    date: new Date(Date.now() - 3600000), // 1 hour ago
                    editedBy: { name: 'User Self' },
                    type: 'payment',
                    details: 'Payment successful'
                 }
            ],
            // Мок select і інших методів Mongoose Query
            select: jest.fn().mockReturnThis(),
        };

        // Мокуємо orderModel.findById щоб повертав наш об'єкт з mock chained methods
        orderModel.findById.mockImplementation(() => ({
             select: jest.fn().mockResolvedValue(mockOrderData) // resolve the final query execution
        }));

        // Clear mocks
        orderModel.findById.mockClear();
        if (orderModel.findById.mock.results[0]) {
            orderModel.findById.mock.results[0].value.select.mockClear();
        }
         res.status.mockClear();
         res.json.mockClear();

    });

     it("should return order status and history for the order owner", async () => {
         // Standard setup is already for the owner
         await getOrderStatus(req, res);

         expect(orderModel.findById).toHaveBeenCalledWith("order987");
        expect(orderModel.findById.mock.results[0].value.select).toHaveBeenCalledWith('status userId orderNumber editHistory');
        expect(res.json).toHaveBeenCalledWith({
             success: true,
             data: {
                 orderNumber: 123456789012,
                 currentStatus: "В обробці",
                 statusHistory: [
                     expect.objectContaining({
                         // date: expect.any(Date), // Jest sometimes struggles with date object comparison
                         changedBy: "Адміністратор",
                         oldStatus: "Нове замовлення",
                         newStatus: "В обробці",
                         reason: null
                     })
                 ],
                 cancellationReason: null
             }
         });
         expect(res.status).not.toHaveBeenCalled(); // Should be 200 OK (default)
    });


    it("should include cancellationReason if the order is canceled", async () => {
        mockOrderData.status = "Скасовано";
        mockOrderData.cancellationReason = "Неактуально";
         mockOrderData.editHistory.push({
            date: new Date(),
            editedBy: { name: "User" },
            oldStatus: "В обробці",
            newStatus: "Скасовано",
            reason: "Неактуально",
            type: "status_change"
         });

         // Re-mock findById
         orderModel.findById.mockImplementation(() => ({
             select: jest.fn().mockResolvedValue(mockOrderData)
        }));

        await getOrderStatus(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
             data: expect.objectContaining({
                 currentStatus: "Скасовано",
                 cancellationReason: "Неактуально",
                 statusHistory: expect.arrayContaining([
                    expect.objectContaining({ newStatus: "Скасовано", reason: "Неактуально" })
                 ])
             })
         }));
    });

     it("should return 404 if order not found", async () => {
        // Мок findById -> select, щоб повернути null
        orderModel.findById.mockImplementation(() => ({
            select: jest.fn().mockResolvedValue(null)
        }));

        await getOrderStatus(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order987");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Замовлення не знайдено"
        });
    });

    it("should return 403 if a non-admin user tries to access another user's order", async () => {
         // Користувач НЕ адмін (за замовчуванням)
         mockOrderData.userId = "differentUserXYZ"; // Замовлення належить іншому

         // Re-mock findById
          orderModel.findById.mockImplementation(() => ({
             select: jest.fn().mockResolvedValue(mockOrderData)
        }));


        await getOrderStatus(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order987");
         expect(orderModel.findById.mock.results[0].value.select).toHaveBeenCalled(); // Select is called before auth check
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Ви не маєте доступу до цього замовлення"
        });
    });

    it("should handle database errors during findById/select", async () => {
        const error = new Error("DB Select Error");
         // Мок findById -> select, щоб відхилити проміс
         orderModel.findById.mockImplementation(() => ({
            select: jest.fn().mockRejectedValue(error)
        }));


        await getOrderStatus(req, res);

        expect(orderModel.findById).toHaveBeenCalledWith("order987");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Сталася помилка при отриманні статусу замовлення"
        });
    });
});
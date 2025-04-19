// src/controllers/__tests__/cartController.test.js
import { addToCart, removeFromCart, getCart } from '../../cartController.js'; // Шлях до вашого контролера
import userModel from '../../../models/userModel.js'; // Шлях до вашої моделі

// Мокуємо (імітуємо) userModel
jest.mock('../../../models/userModel.js');

// Очищаємо всі моки перед кожним тестом
beforeEach(() => {
    jest.clearAllMocks();
    // Скидаємо реалізацію моків для кожної функції userModel перед кожним тестом
    userModel.findById.mockReset();
    userModel.findByIdAndUpdate.mockReset();
});

// ----- Тести для addToCart -----
describe('addToCart', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Базова відповідь
        mockRes = {
            json: jest.fn(),
        };
        // Мок console.log, щоб уникнути виводу в консоль під час тестів
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        // Відновлюємо оригінальну реалізацію console.log
        console.log.mockRestore();
    });

    // TCACS01: Успішне додавання нового товару в порожній кошик
    it('має додати новий товар, якщо кошик порожній (TCACS01)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
        const mockUserData = {
            _id: userId,
            cartData: {},
            // Мокуємо findByIdAndUpdate на рівні екземпляра моделі або використовуємо статичний findByIdAndUpdate
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true); // Імітуємо успішне оновлення

        await addToCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: { [itemId]: 1 } } // Очікуємо, що товар додано з кількістю 1
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Додано до кошика" });
    });

    // TCACS02: Успішне збільшення кількості існуючого товару
    it('має збільшити кількість товару, якщо він вже є в кошику (TCACS02)', async () => {
        const userId = 'user1';
        const itemId = 'itemB';
        mockReq = {
            body: { userId, itemId },
        };
        const initialCartData = { [itemId]: 2 };
        const mockUserData = {
            _id: userId,
            cartData: initialCartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await addToCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: { [itemId]: 3 } } // Очікуємо, що кількість збільшилась на 1
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Додано до кошика" });
    });

    // TCACE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCACE01)', async () => {
        const userId = 'user_not_found';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
        userModel.findById.mockResolvedValue(null); // Користувача не знайдено

        await addToCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled(); // Оновлення не має відбутись
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        // Опціонально: перевірити виклик console.log, якщо є доступ до помилки
        expect(console.log).toHaveBeenCalled();
    });

     // TCACE02: Помилка при виклику findById
    it('має повернути помилку сервера при помилці userModel.findById (TCACE02)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError); // findById кидає помилку

        await addToCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });

    // TCACE03: Помилка при виклику findByIdAndUpdate
    it('має повернути помилку сервера при помилці userModel.findByIdAndUpdate (TCACE03)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
         const mockUserData = {
            _id: userId,
            cartData: {},
        };
        userModel.findById.mockResolvedValue(mockUserData);
        const dbUpdateError = new Error('Database update error');
        userModel.findByIdAndUpdate.mockRejectedValue(dbUpdateError); // findByIdAndUpdate кидає помилку

        await addToCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { cartData: { [itemId]: 1 } });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbUpdateError);
    });
});


// ----- Тести для removeFromCart -----
describe('removeFromCart', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockRes = {
            json: jest.fn(),
        };
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

     afterEach(() => {
        console.log.mockRestore();
    });

    // TCRCS01: Успішне зменшення кількості товару (>1)
    it('має зменшити кількість товару, якщо його > 1 (TCRCS01)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
        const initialCartData = { [itemId]: 3 };
        const mockUserData = {
            _id: userId,
            cartData: initialCartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: { [itemId]: 2 } } // Очікуємо зменшення кількості
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з кошика" });
    });

    // TCRCS02: Успішне зменшення кількості товару (==1)
    it('має зменшити кількість товару до 0, якщо його було 1 (TCRCS02)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
        const initialCartData = { [itemId]: 1 };
         const mockUserData = {
            _id: userId,
            cartData: initialCartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: { [itemId]: 0 } } // Кількість стає 0
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з кошика" });
    });

     // TCRCS03: Спроба видалити товар з кількістю 0
    it('не має змінювати кількість, якщо товару вже 0 (TCRCS03)', async () => {
        const userId = 'user1';
        const itemId = 'itemA';
        mockReq = {
            body: { userId, itemId },
        };
         const initialCartData = { [itemId]: 0 };
         const mockUserData = {
            _id: userId,
            cartData: initialCartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
         // Оновлення все одно викликається, але з тим самим значенням
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: { [itemId]: 0 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з кошика" });
    });

     // TCRCS04: Спроба видалити товар, якого немає в кошику
    it('не має змінювати кошик, якщо товару немає (TCRCS04)', async () => {
        const userId = 'user1';
        const itemId = 'itemNotInCart';
         mockReq = {
            body: { userId, itemId },
        };
        const initialCartData = { itemA: 1 };
        const mockUserData = {
            _id: userId,
            cartData: initialCartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        // Оновлення все одно викликається, але кошик не змінюється, бо умова `cartData[req.body.itemId] > 0` не виконається
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { cartData: initialCartData }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з кошика" });
    });

    // TCRCE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCRCE01)', async () => {
        const userId = 'user_not_found';
        const itemId = 'itemA';
         mockReq = {
            body: { userId, itemId },
        };
        userModel.findById.mockResolvedValue(null);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalled();
    });

     // TCRCE02: Помилка при findById
    it('має повернути помилку сервера при помилці userModel.findById (TCRCE02)', async () => {
       const userId = 'user1';
       const itemId = 'itemA';
       mockReq = {
            body: { userId, itemId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });

     // TCRCE03: Помилка при findByIdAndUpdate
    it('має повернути помилку сервера при помилці userModel.findByIdAndUpdate (TCRCE03)', async () => {
       const userId = 'user1';
       const itemId = 'itemA';
       mockReq = {
            body: { userId, itemId },
        };
        const mockUserData = {
            _id: userId,
            cartData: { [itemId]: 1 },
        };
        userModel.findById.mockResolvedValue(mockUserData);
        const dbUpdateError = new Error('Database update error');
        userModel.findByIdAndUpdate.mockRejectedValue(dbUpdateError);

        await removeFromCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { cartData: { [itemId]: 0 } });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbUpdateError);
    });
});

// ----- Тести для getCart -----
describe('getCart', () => {
    let mockReq;
    let mockRes;

     beforeEach(() => {
        mockRes = {
            json: jest.fn(),
        };
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

     afterEach(() => {
        console.log.mockRestore();
    });

     // TCGCS01: Успішне отримання не порожнього кошика
    it('має повернути дані кошика користувача (TCGCS01)', async () => {
        const userId = 'user1';
        mockReq = {
            body: { userId },
        };
        const cartData = { itemA: 2, itemB: 1 };
         const mockUserData = {
            _id: userId,
            cartData: cartData,
        };
        userModel.findById.mockResolvedValue(mockUserData);

        await getCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, cartData: cartData });
    });

     // TCGCS02: Успішне отримання порожнього кошика
    it('має повернути порожній об\'єкт, якщо кошик порожній (TCGCS02)', async () => {
        const userId = 'user1';
        mockReq = {
            body: { userId },
        };
        const mockUserData = {
            _id: userId,
            cartData: {},
        };
        userModel.findById.mockResolvedValue(mockUserData);

        await getCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, cartData: {} });
    });

     // TCGCE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCGCE01)', async () => {
        const userId = 'user_not_found';
         mockReq = {
            body: { userId },
        };
        userModel.findById.mockResolvedValue(null);

        await getCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalled();
    });

    // TCGCE02: Помилка при findById
    it('має повернути помилку сервера при помилці userModel.findById (TCGCE02)', async () => {
       const userId = 'user1';
       mockReq = {
            body: { userId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError);

        await getCart(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });
});
// src/controllers/__tests__/favouriteController.test.js
import { addToFavourite, removeFromFavourite, getFavourite } from '../../favouriteController.js'; // Шлях до вашого контролера
import userModel from '../../../models/userModel.js'; // Шлях до вашої моделі

// Мокуємо (імітуємо) userModel
jest.mock('../../../models/userModel.js');

// Очищаємо всі моки перед кожним тестом
beforeEach(() => {
    jest.clearAllMocks();
    userModel.findById.mockReset();
    userModel.findByIdAndUpdate.mockReset();
});

// ----- Тести для addToFavourite -----
describe('addToFavourite', () => {
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

    // TCAFS01: Успішне додавання нового товару в порожній список улюблених
    it('має додати новий товар до улюблених, якщо список порожній (TCAFS01)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const mockUserData = {
            _id: userId,
            favourites: {},
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await addToFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: { [itemId]: 1 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Додано до улюблених" });
    });

    // TCAFS02: Успішне збільшення лічильника існуючого улюбленого товару
    it('має збільшити лічильник товару, якщо він вже є в улюблених (TCAFS02)', async () => {
        const userId = 'user1';
        const itemId = 'favItemB';
        mockReq = {
            body: { userId, itemId },
        };
        const initialFavourites = { [itemId]: 2 };
        const mockUserData = {
            _id: userId,
            favourites: initialFavourites,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await addToFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: { [itemId]: 3 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Додано до улюблених" });
    });

    // TCAFE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCAFE01)', async () => {
        const userId = 'user_not_found';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        userModel.findById.mockResolvedValue(null);

        await addToFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalled();
    });

     // TCAFE02: Помилка при виклику findById
    it('має повернути помилку сервера при помилці userModel.findById (TCAFE02)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError);

        await addToFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });

    // TCAFE03: Помилка при виклику findByIdAndUpdate
    it('має повернути помилку сервера при помилці userModel.findByIdAndUpdate (TCAFE03)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const mockUserData = {
            _id: userId,
            favourites: {},
        };
        userModel.findById.mockResolvedValue(mockUserData);
        const dbUpdateError = new Error('Database update error');
        userModel.findByIdAndUpdate.mockRejectedValue(dbUpdateError);

        await addToFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { favourites: { [itemId]: 1 } });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbUpdateError);
    });
});

// ----- Тести для removeFromFavourite -----
describe('removeFromFavourite', () => {
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

    // TCRFS01: Успішне зменшення лічильника товару (>1)
    it('має зменшити лічильник улюбленого товару, якщо його > 1 (TCRFS01)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const initialFavourites = { [itemId]: 3 };
        const mockUserData = {
            _id: userId,
            favourites: initialFavourites,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: { [itemId]: 2 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з улюблених" });
    });

    // TCRFS02: Успішне зменшення лічильника товару (==1)
    it('має зменшити лічильник до 0, якщо його було 1 (TCRFS02)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const initialFavourites = { [itemId]: 1 };
        const mockUserData = {
            _id: userId,
            favourites: initialFavourites,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: { [itemId]: 0 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з улюблених" });
    });

     // TCRFS03: Спроба видалити товар з лічильником 0
    it('не має змінювати лічильник, якщо його вже 0 (TCRFS03)', async () => {
        const userId = 'user1';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        const initialFavourites = { [itemId]: 0 };
        const mockUserData = {
            _id: userId,
            favourites: initialFavourites,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        // Оновлення викликається, але зі значенням 0
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: { [itemId]: 0 } }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з улюблених" });
    });

     // TCRFS04: Спроба видалити товар, якого немає в списку
    it('не має змінювати список, якщо товару немає (TCRFS04)', async () => {
        const userId = 'user1';
        const itemId = 'favItemNotInList';
         mockReq = {
            body: { userId, itemId },
        };
        const initialFavourites = { favItemA: 1 };
        const mockUserData = {
            _id: userId,
            favourites: initialFavourites,
        };
        userModel.findById.mockResolvedValue(mockUserData);
        userModel.findByIdAndUpdate.mockResolvedValue(true);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        // Оновлення викликається, але дані ті самі, бо умова `favourites[req.body.itemId] > 0` не виконується
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            userId,
            { favourites: initialFavourites }
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Видалено з улюблених" });
    });

    // TCRFE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCRFE01)', async () => {
        const userId = 'user_not_found';
        const itemId = 'favItemA';
        mockReq = {
            body: { userId, itemId },
        };
        userModel.findById.mockResolvedValue(null);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalled();
    });

     // TCRFE02: Помилка при findById
    it('має повернути помилку сервера при помилці userModel.findById (TCRFE02)', async () => {
       const userId = 'user1';
       const itemId = 'favItemA';
       mockReq = {
            body: { userId, itemId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });

     // TCRFE03: Помилка при findByIdAndUpdate
    it('має повернути помилку сервера при помилці userModel.findByIdAndUpdate (TCRFE03)', async () => {
       const userId = 'user1';
       const itemId = 'favItemA';
       mockReq = {
            body: { userId, itemId },
        };
        const mockUserData = {
            _id: userId,
            favourites: { [itemId]: 1 },
        };
        userModel.findById.mockResolvedValue(mockUserData);
        const dbUpdateError = new Error('Database update error');
        userModel.findByIdAndUpdate.mockRejectedValue(dbUpdateError);

        await removeFromFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { favourites: { [itemId]: 0 } });
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbUpdateError);
    });
});

// ----- Тести для getFavourite -----
describe('getFavourite', () => {
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

     // TCGFS01: Успішне отримання не порожнього списку улюблених
    it('має повернути дані списку улюблених користувача (TCGFS01)', async () => {
        const userId = 'user1';
        mockReq = {
            body: { userId },
        };
        const favouritesData = { favItemA: 2, favItemB: 1 };
        const mockUserData = {
            _id: userId,
            favourites: favouritesData,
        };
        userModel.findById.mockResolvedValue(mockUserData);

        await getFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, favourites: favouritesData });
    });

     // TCGFS02: Успішне отримання порожнього списку
    it('має повернути порожній об\'єкт, якщо список улюблених порожній (TCGFS02)', async () => {
        const userId = 'user1';
        mockReq = {
            body: { userId },
        };
        const mockUserData = {
            _id: userId,
            favourites: {},
        };
        userModel.findById.mockResolvedValue(mockUserData);

        await getFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, favourites: {} });
    });

     // TCGFE01: Помилка, якщо користувача не знайдено
    it('має повернути помилку, якщо користувача не знайдено (TCGFE01)', async () => {
        const userId = 'user_not_found';
        mockReq = {
            body: { userId },
        };
        userModel.findById.mockResolvedValue(null);

        await getFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalled();
    });

    // TCGFE02: Помилка при findById
    it('має повернути помилку сервера при помилці userModel.findById (TCGFE02)', async () => {
       const userId = 'user1';
       mockReq = {
            body: { userId },
        };
        const dbError = new Error('Database find error');
        userModel.findById.mockRejectedValue(dbError);

        await getFavourite(mockReq, mockRes);

        expect(userModel.findById).toHaveBeenCalledWith(userId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(console.log).toHaveBeenCalledWith(dbError);
    });
});
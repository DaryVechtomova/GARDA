import Review from '../../../models/reviewModel.js';
// Припускаємо, що User модель потрібна для populate, хоча вона тут прямо не тестується
import User from '../../../models/userModel.js';
import {
    createReview,
    getReviewsForUser,
    // getReviewsForAdmin, deleteReview - це для адміна, їх не тестуємо тут
} from '../../reviewController.js'; // Припускаємо, що контролер знаходиться тут

// Мокуємо моделі
jest.mock('../../../models/reviewModel.js');
jest.mock('../../../models/userModel.js'); // Мокуємо, хоча може й не знадобитись для цих тестів, крім populate

// ----- Тести для createReview (Доступно для користувачів) -----
describe('createReview', () => {
    let req, res, mockReviewInstance;
    const productId = 'product123';
    const userId = 'user456';
    const commentText = ' Дуже гарний товар! ';

    beforeEach(() => {
        req = {
            body: {
                productId: productId,
                comment: commentText,
            },
            // Симулюємо результат роботи authMiddleware
            user: {
                _id: userId,
                // Можна додати інші поля користувача, якщо вони використовуються
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Мок для екземпляру моделі Review та його методу save
        mockReviewInstance = {
            _id: 'review789', // Присвоюємо ID новоствореному відгуку
            product: productId,
            user: userId,
            comment: commentText.trim(),
            save: jest.fn(),
            // Можна додати інші поля за замовчуванням, якщо треба
            createdAt: new Date(),
            updatedAt: new Date(),
            isVisible: true,
        };

        // Мок конструктора Review, щоб повертав наш екземпляр
        Review.mockImplementation(() => mockReviewInstance);
        mockReviewInstance.save.mockResolvedValue(mockReviewInstance); // Мок save

        // Мок для findById().populate()
        Review.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ // Симулюємо populate після збереження
                 ...mockReviewInstance,
                 user: { // Додаємо замокані дані користувача
                    _id: userId,
                    firstName: 'Тест',
                    secondName: 'Користувач',
                 }
            }),
        });

         // Очистка моків
         jest.clearAllMocks();
    });

    it('повинен успішно створити відгук з валідними даними', async () => {
        await createReview(req, res);

        // Перевірка виклику конструктора
        expect(Review).toHaveBeenCalledTimes(1);
        expect(Review).toHaveBeenCalledWith({
            product: productId,
            user: userId,
            comment: commentText.trim(), // Перевіряємо, що коментар обрізано
        });

        // Перевірка виклику save
        expect(mockReviewInstance.save).toHaveBeenCalledTimes(1);

         // Перевірка виклику findById().populate() для отримання даних для відповіді
         expect(Review.findById).toHaveBeenCalledWith(mockReviewInstance._id);
         expect(Review.findById().populate).toHaveBeenCalledWith('user', 'firstName secondName');


        // Перевірка відповіді
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: expect.objectContaining({ // Перевіряємо структуру та наявність ключових полів
                 _id: 'review789',
                 product: productId,
                 comment: commentText.trim(),
                 user: expect.objectContaining({
                     _id: userId,
                     firstName: 'Тест',
                     secondName: 'Користувач',
                 })
             }),
            message: "Відгук успішно додано",
        });
    });

    it('повинен повертати помилку 400, якщо productId не надано', async () => {
        req.body.productId = undefined;
        await createReview(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Необхідно надати ID товару та текст коментаря.'
        });
        expect(mockReviewInstance.save).not.toHaveBeenCalled(); // Збереження не повинно викликатись
    });

     it('повинен повертати помилку 400, якщо коментар відсутній або порожній', async () => {
        req.body.comment = '   '; // Порожній коментар після trim
        await createReview(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Необхідно надати ID товару та текст коментаря.'
        });
         expect(mockReviewInstance.save).not.toHaveBeenCalled();
    });

     it('повинен повертати помилку 400, якщо коментар не є рядком', async () => {
        req.body.comment = 12345; // Невірний тип
        await createReview(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Необхідно надати ID товару та текст коментаря.'
        });
        expect(mockReviewInstance.save).not.toHaveBeenCalled();
    });

    it('повинен повертати помилку 401, якщо userId відсутній у req.user', async () => {
        req.user = undefined; // Симулюємо відсутність користувача (мало б бути перехоплено middleware)
        await createReview(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Помилка авторизації.'
        });
        expect(mockReviewInstance.save).not.toHaveBeenCalled();
    });

     it('повинен повертати помилку 500, якщо виникає помилка під час збереження', async () => {
        const saveError = new Error('Database save failed');
        mockReviewInstance.save.mockRejectedValue(saveError); // Мокуємо помилку save

        await createReview(req, res);

        expect(mockReviewInstance.save).toHaveBeenCalledTimes(1); // Save було викликано
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Виникла помилка при створенні відгуку. Спробуйте пізніше.'
        });
        // У цьому випадку findById не мав викликатись
        expect(Review.findById).not.toHaveBeenCalled();
    });

      it('повинен повертати помилку 500, якщо виникає помилка під час populate', async () => {
        // Збереження проходить успішно
        mockReviewInstance.save.mockResolvedValue(mockReviewInstance);
        // А populate видає помилку
        const populateError = new Error('Populate failed');
        Review.findById = jest.fn().mockReturnValue({
             populate: jest.fn().mockRejectedValue(populateError)
        });


        await createReview(req, res);

        expect(mockReviewInstance.save).toHaveBeenCalledTimes(1);
         expect(Review.findById).toHaveBeenCalledWith(mockReviewInstance._id); // findById було викликано
         expect(Review.findById().populate).toHaveBeenCalled(); // populate було викликано

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Виникла помилка при створенні відгуку. Спробуйте пізніше.'
        });
    });
});

// ----- Тести для getReviewsForUser (Доступно для користувачів) -----
describe('getReviewsForUser', () => {
    let req, res;
    const productId = 'product-xyz';

    beforeEach(() => {
        req = {
            params: { productId: productId }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Мок для find().populate()
        // Потрібно симулювати, що populate викликається ПІСЛЯ find
        Review.find = jest.fn().mockReturnThis(); // find повертає 'this' (саму query)
        Review.populate = jest.fn(); // визначаємо мок populate
        Review.find.mockReturnValue({ // Тепер можемо ланцюжком викликати populate
            populate: Review.populate // використовуємо створений мок populate
        });


         // Очистка моків
         jest.clearAllMocks();
          Review.populate.mockClear(); // Також очищаємо окремо populate
    });

    it('повинен повертати список видимих відгуків для товару', async () => {
        const mockVisibleReviews = [
            {
                _id: 'rev1', product: productId, comment: 'Ok', isVisible: true,
                user: { _id: 'user1', firstName: 'Анна', secondName: 'Іванова' }
            },
            {
                 _id: 'rev2', product: productId, comment: 'Супер!', isVisible: true,
                user: { _id: 'user2', firstName: 'Петро', secondName: 'Сидоренко' }
            }
            // Прихований відгук тут не повинен бути
        ];
        // Мокуємо, що find().populate() поверне ці дані
        Review.populate.mockResolvedValue(mockVisibleReviews);

        await getReviewsForUser(req, res);

        // Перевіряємо, що find викликався з правильними фільтрами
        expect(Review.find).toHaveBeenCalledWith({
            product: productId,
            isVisible: true // Ключова умова
        });

        // Перевіряємо, що populate викликався для даних користувача
        expect(Review.populate).toHaveBeenCalledWith('user', 'firstName secondName');

        // Перевіряємо успішну відповідь
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: mockVisibleReviews });
    });

     it('повинен повертати порожній масив, якщо видимих відгуків для товару немає', async () => {
        Review.populate.mockResolvedValue([]); // Симулюємо порожній результат

        await getReviewsForUser(req, res);

        expect(Review.find).toHaveBeenCalledWith({ product: productId, isVisible: true });
        expect(Review.populate).toHaveBeenCalledWith('user', 'firstName secondName');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

     it('повинен повертати помилку 500, якщо виникає проблема з базою даних', async () => {
        const dbError = new Error('Failed to query database');
        Review.populate.mockRejectedValue(dbError); // Симулюємо помилку виконання запиту

        await getReviewsForUser(req, res);

        expect(Review.find).toHaveBeenCalledWith({ product: productId, isVisible: true });
         expect(Review.populate).toHaveBeenCalledWith('user', 'firstName secondName');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Не вдалося отримати відгуки' });
    });
});
import {
    addProduct,
    listProduct,
    removeProduct,
    editProduct,
    removeDiscount,
    editDiscount,
} from '../../productController.js';
import productModel from '../../../models/productModel.js';
import invoiceModel from '../../../models/invoiceModel.js';
import orderModel from '../../../models/orderModel.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

jest.mock('../../../models/productModel.js');
jest.mock('../../../models/invoiceModel.js');
jest.mock('../../../models/orderModel.js');
jest.mock('fs');
jest.mock('path');

beforeEach(() => {
    jest.clearAllMocks();

    // Налаштовуємо базовий мок
    path.join.mockImplementation((...args) => args.join('\\'));

    // Імітуємо, що моделі зареєстровані в mongoose
    mongoose.models = {
        invoice: invoiceModel,
        order: orderModel,
        product: productModel,
    };
});

// Тести для addProduct
describe('addProduct', () => {
    let mockReq;
    let mockRes;
    let mockSave;

    beforeEach(() => {
        mockSave = jest.fn().mockResolvedValue({ _id: 'newProductId', name: 'Тестовий товар' });
        productModel.mockImplementation(() => ({ save: mockSave }));
        productModel.findOne.mockResolvedValue(null);

        mockReq = {
            body: {
                name: 'Тестовий товар',
                description: 'Опис',
                price: 100,
                category: 'Категорія1',
                colors: ['білий', 'червоний'],
                sizes: [{ size: 'S', quantity: 5 }, { size: 'M', quantity: 10 }],
                threads: 'Бавовна',
                cut: 'Прямий',
                technique: 'Хрестик',
                fabric: 'Льон',
            },
            files: [{ filename: 'image1.jpg' }, { filename: 'image2.png' }],
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
    });

    it('має успішно додати товар з валідними даними (TCPW01)', async () => {
        await addProduct(mockReq, mockRes);

        expect(productModel.findOne).toHaveBeenCalledWith({ name: 'Тестовий товар', colors: ['білий', 'червоний'] });
        expect(productModel).toHaveBeenCalledWith({
            name: 'Тестовий товар',
            description: 'Опис',
            price: 100,
            category: 'Категорія1',
            images: ['image1.jpg', 'image2.png'],
            threads: 'Бавовна',
            cut: 'Прямий',
            technique: 'Хрестик',
            fabric: 'Льон',
            colors: ['білий', 'червоний'],
            sizes: [{ size: 'S', quantity: 5 }, { size: 'M', quantity: 10 }],
        });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Товар додано" });
    });

    // Тести на валідацію
    test.each([
        ['name', 'Будь ласка, введіть назву товару', undefined],
        ['description', 'Будь ласка, введіть опис товару', undefined],
        ['price', 'Ціна має бути більше 0', 0],
        ['price', 'Ціна має бути більше 0', -50],
        ['category', 'Будь ласка, оберіть категорію товару', undefined],
        ['category', 'Будь ласка, оберіть категорію товару', 'Оберіть категорію'],
        ['colors', 'Будь ласка, введіть колір товару', undefined],
    ])('TCPW02 і TCPW03 - має повернути 400, якщо поле "%s" відсутнє або неправильне (%p)', async (field, message, value) => {
        if (value === undefined) {
            delete mockReq.body[field];
        } else {
            mockReq.body[field] = value;
        }
        await addProduct(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCPW04 - має повернути 400, якщо не завантажено зображень', async () => {
        mockReq.files = [];
        await addProduct(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, завантажте хоча б одне зображення товару" });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCPW05 - має повернути 400, якщо товар вже існує', async () => {
        productModel.findOne.mockResolvedValue({ _id: 'existingId' });
        await addProduct(mockReq, mockRes);
        expect(productModel.findOne).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар з такою назвою та кольором вже існує" });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCPW06 - має повернути 400, якщо є дублікати розмірів', async () => {
        mockReq.body.sizes = [{ size: 'M', quantity: 5 }, { size: 'M', quantity: 3 }];
        await addProduct(mockReq, mockRes);
        expect(productModel.findOne).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Дублікати розмірів не допускаються. Виправте, будь ласка." });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCPW07 - має повернути 500, якщо сталася помилка збереження', async () => {
        const dbError = new Error('DB Save Error');
        mockSave.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await addProduct(mockReq, mockRes);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при додаванні товару" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для listProduct
describe('listProduct', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {};
        mockRes = { json: jest.fn() };
    });

    it('TCPW08 - має повернути список товарів з ціною зі знижкою', async () => {
        const productsData = [
            { _id: '1', name: 'Товар 1', price: 100, discount: 10 },
            { _id: '2', name: 'Товар 2', price: 200, discount: 0 },
            { _id: '3', name: 'Товар 3', price: 150, discount: 25 },
        ];
        // Імітуємо документи Mongoose з методом toObject
        const mockProducts = productsData.map(p => ({ ...p, toObject: jest.fn().mockReturnValue(p) }));
        productModel.find.mockResolvedValue(mockProducts);

        await listProduct(mockReq, mockRes);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            data: [
                expect.objectContaining({ _id: '1', discountedPrice: 90 }),
                expect.objectContaining({ _id: '2', discountedPrice: 200 }),
                expect.objectContaining({ _id: '3', discountedPrice: 112.5 }),
            ]
        });
        // Перевіряємо, що toObject викликався для кожного
        expect(mockProducts[0].toObject).toHaveBeenCalledTimes(1);
        expect(mockProducts[1].toObject).toHaveBeenCalledTimes(1);
        expect(mockProducts[2].toObject).toHaveBeenCalledTimes(1);
    });

    it('TCPR01 - має повернути помилку 500, якщо find кидає помилку', async () => {
        const dbError = new Error('DB Find Error');
        productModel.find.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await listProduct(mockReq, mockRes);
        expect(productModel.find).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для removeProduct
describe('removeProduct', () => {
    let mockReq;
    let mockRes;
    const productId = 'product123';
    const mockProductWithImages = {
        _id: productId,
        name: 'Товар На Видалення',
        images: ['image1.jpg', 'image2.png'],
    };

    beforeEach(() => {
        mockReq = { body: { id: productId } };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };

        invoiceModel.find.mockResolvedValue([]);
        orderModel.find.mockResolvedValue([]);
        productModel.findById.mockResolvedValue(mockProductWithImages);
        productModel.findByIdAndDelete.mockResolvedValue({ _id: productId });
        fs.existsSync.mockReturnValue(true);
        fs.unlinkSync.mockImplementation(() => { });
    });

    it('TCPW09 - має успішно видалити товар і зображення, якщо немає залежностей', async () => {
        await removeProduct(mockReq, mockRes);

        expect(invoiceModel.find).toHaveBeenCalledWith({ "products.product": productId, status: { $ne: "скасована" } });
        expect(orderModel.find).toHaveBeenCalledWith({ "items.productId": productId, status: { $ne: "скасоване замовлення" } });
        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(fs.existsSync).toHaveBeenCalledWith(path.join('uploads', 'image1.jpg'));
        expect(fs.unlinkSync).toHaveBeenCalledWith(path.join('uploads', 'image1.jpg'));
        expect(fs.existsSync).toHaveBeenCalledWith(path.join('uploads', 'image2.png'));
        expect(fs.unlinkSync).toHaveBeenCalledWith(path.join('uploads', 'image2.png'));
        expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(productId);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Товар видалено" });
    });

    it('TCPW10 - має повернути 409 з повідомленням про накладні, якщо товар є в активних накладних', async () => {
        invoiceModel.find.mockResolvedValue([{ _id: 'inv1' }]);
        await removeProduct(mockReq, mockRes);

        expect(invoiceModel.find).toHaveBeenCalledWith({
            "products.product": productId,
            status: { $ne: "скасована" }
        });
        expect(orderModel.find).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Не можна видаляти товари, які є в накладних"
        });
        expect(productModel.findByIdAndDelete).not.toHaveBeenCalled();
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('TCPW11 - має повернути 409 з повідомленням про замовлення, якщо товар є в активних замовленнях', async () => {
        invoiceModel.find.mockResolvedValue([]);
        orderModel.find.mockResolvedValue([{ _id: 'ord1' }]);

        await removeProduct(mockReq, mockRes);

        expect(invoiceModel.find).toHaveBeenCalledTimes(1);
        expect(orderModel.find).toHaveBeenCalledWith({
            "items.productId": productId,
            status: { $ne: "скасоване замовлення" }
        });
        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Не можна видаляти товари, які є в замовленнях"
        });
        expect(productModel.findByIdAndDelete).not.toHaveBeenCalled();
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('TCPW12 - має повернути 404, якщо товар не знайдено', async () => {
        productModel.findById.mockResolvedValue(null);
        await removeProduct(mockReq, mockRes);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Товар не знайдено"
        });
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('TCPW13 - має видалити товар, навіть якщо зображення не існує на диску', async () => {
        fs.existsSync.mockReturnValue(false);
        await removeProduct(mockReq, mockRes);
        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(fs.existsSync).toHaveBeenCalledTimes(2);
        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(productId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Товар видалено" });
    });

    it('TCPW14 - має повернути 500 при помилці видалення файлу', async () => {
        const unlinkError = new Error('FS Unlink Error');
        fs.unlinkSync.mockImplementation(() => { throw unlinkError; });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeProduct(mockReq, mockRes);
        expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
        expect(productModel.findByIdAndDelete).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні товару" });
        expect(consoleSpy).toHaveBeenCalledWith(unlinkError);
        consoleSpy.mockRestore();
    });

    it('має повернути помилку, якщо сталася помилка при видаленні з БД', async () => {
        const deleteError = new Error('DB Delete Error');
        productModel.findByIdAndDelete.mockRejectedValue(deleteError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeProduct(mockReq, mockRes);
        expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(productId);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні товару" });
        expect(consoleSpy).toHaveBeenCalledWith(deleteError);
        consoleSpy.mockRestore();
    });
});

// Тести для editProduct
describe('editProduct', () => {
    let mockReq;
    let mockRes;
    const productId = 'product123';
    let mockExistingProduct;

    beforeEach(() => {
        productModel.findOne.mockResolvedValue(null);
        mockExistingProduct = {
            _id: productId,
            name: 'Старий товар',
            description: 'Старий опис',
            price: 100,
            category: 'Категорія1',
            colors: 'синій',
            images: ['old1.jpg', 'old2.jpg'],
        };
        mockReq = {
            body: {
                id: productId,
                name: 'Новий товар',
                description: 'Новий опис',
                price: 150,
                category: 'Категорія2',
                colors: 'зелений',
            },
            files: [],
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
        // Моки
        productModel.findById.mockResolvedValue(mockExistingProduct);
        productModel.findOne.mockResolvedValue(null);
        productModel.findByIdAndUpdate.mockResolvedValue({ ...mockExistingProduct, ...mockReq.body });
        fs.existsSync.mockReturnValue(true);
        fs.unlinkSync.mockImplementation(() => { });
    });

    it('TCPW15 - має успішно оновити товар', async () => {
        await editProduct(mockReq, mockRes);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('має обробити випадок, коли товар не знайдено (findById)', async () => {
        productModel.findById.mockResolvedValue(null);
        await removeProduct(mockReq, mockRes);

        expect(productModel.findById).toHaveBeenCalledWith(productId);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Товар не знайдено"
        });
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('TCP17 - має успішно додати нові зображення', async () => {
        mockReq.files = [{ filename: 'new1.jpg' }, { filename: 'new2.jpg' }];
        await editProduct(mockReq, mockRes);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            productId,
            expect.objectContaining({
                images: ['old1.jpg', 'old2.jpg', 'new1.jpg', 'new2.jpg'] // Старі + нові
            }),
            { new: true }
        );
        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('має успішно видалити старі і додати нові зображення', async () => {
        mockReq.body.existingImages = JSON.stringify(['old2.jpg']);
        mockReq.files = [{ filename: 'new3.jpg' }];
        const removedImagePath = path.join('uploads', 'old1.jpg');
        await editProduct(mockReq, mockRes);
        expect(fs.unlinkSync).toHaveBeenCalledWith(removedImagePath);
        expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            productId,
            expect.objectContaining({ images: ['old2.jpg', 'new3.jpg'] }),
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    describe('Валідація полів', () => {
        it.each([
            ['name', "Будь ласка, введіть назву товару", undefined],
            ['description', "Будь ласка, введіть опис товару", undefined],
            ['price', "Ціна має бути більше 0", 0],
            ['colors', "Будь ласка, введіть колір товару", ""],
        ])('TCPW18 - має повернути 400 якщо поле "%s" неправильне (%s)', async (field, message, value) => {
            if (value === undefined) delete mockReq.body[field];
            else mockReq.body[field] = value;

            await editProduct(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message });
        });
    });

    it('TCPW19 - має повернути помилку при наявності дубліката товару', async () => {
        productModel.findOne.mockResolvedValue({ _id: 'anotherId' });
        await editProduct(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар з такою назвою та кольором вже існує" });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCPW20 - має повернути помилку при відсутності товару', async () => {
        productModel.findById.mockResolvedValue(null);
        await editProduct(mockReq, mockRes);
        expect(productModel.findOne).toHaveBeenCalledTimes(1);
        expect(productModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар не знайдено" });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('має повернути 500 при помилці видалення файлу', async () => {
        mockReq.body.existingImages = JSON.stringify(['old2.jpg']);
        const unlinkError = new Error('Unlink Error');
        fs.unlinkSync.mockImplementation(() => { throw unlinkError; });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await editProduct(mockReq, mockRes);
        expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: "Помилка при редагуванні товару" }));
        expect(consoleSpy).toHaveBeenCalledWith(unlinkError);
        consoleSpy.mockRestore();
    });
});

// Тести для removeDiscount
describe('removeDiscount', () => {
    let mockReq;
    let mockRes;
    const productId = 'product123';

    beforeEach(() => {
        mockReq = { params: { id: productId } };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };
        productModel.findByIdAndUpdate.mockResolvedValue({ _id: productId, discount: 0 });
    });

    it('TCPW21 - має успішно видалити знижку', async () => {
        await removeDiscount(mockReq, mockRes);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(productId, { discount: 0 }, { new: true });
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Знижку видалено",
            data: expect.objectContaining({ _id: productId, discount: 0 })
        });
    });

    it('TCPW22 - має повернути помилку при відсутності товару', async () => {
        productModel.findByIdAndUpdate.mockResolvedValue(null);
        await removeDiscount(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар не знайдено" });
    });

    it('має повернути 500 при помилці бази даних', async () => {
        const dbError = new Error('DB Error');
        productModel.findByIdAndUpdate.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeDiscount(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні знижки" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для editDiscount
describe('editDiscount', () => {
    let mockReq;
    let mockRes;
    const productId = 'product123';

    beforeEach(() => {
        mockReq = {
            params: { id: productId },
            body: { discount: 25 },
        };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };
        productModel.findByIdAndUpdate.mockResolvedValue({ _id: productId, discount: 25 });
    });

    it('TCPW23 - має успішно оновити знижку', async () => {
        await editDiscount(mockReq, mockRes);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(productId, { discount: 25 }, { new: true });
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Знижку оновлено",
            data: expect.objectContaining({ _id: productId, discount: 25 })
        });
    });

    test.each([-10, 101])
        ('TCPW24 - має повернути 400, якщо знижка невалідна (%p)', async (invalidDiscount) => {
            mockReq.body.discount = invalidDiscount;
            await editDiscount(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Знижка повинна бути від 0 до 100%" });
            expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
        });

    it('TCPW25 - має повернути помилку при нечисловій знижці', async () => {
        mockReq.body.discount = NaN;
        await editDiscount(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Знижка повинна бути числом"
        });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('має повернути 404, якщо товар не знайдено', async () => {
        productModel.findByIdAndUpdate.mockResolvedValue(null);
        await editDiscount(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар не знайдено" });
    });

    it('має повернути 500 при помилці бази даних', async () => {
        const dbError = new Error('DB Error');
        productModel.findByIdAndUpdate.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await editDiscount(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при оновленні знижки" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});
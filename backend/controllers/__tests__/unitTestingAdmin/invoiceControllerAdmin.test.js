import {
    addInvoice,
    fetchInvoices,
    editInvoice,
    getInvoiceById,
    completeInvoice,
} from '../../invoiceController.js';
import invoiceModel from '../../../models/invoiceModel.js';
import productModel from '../../../models/productModel.js';
import supplierModel from '../../../models/supplierModel.js';

jest.mock('../../../models/invoiceModel.js');
jest.mock('../../../models/productModel.js');
jest.mock('../../../models/supplierModel.js');

beforeEach(() => {
    jest.clearAllMocks();

    if (invoiceModel.prototype?.save) {
        invoiceModel.prototype.save.mockReset();
    } else {
        invoiceModel.prototype.save = jest.fn();
    }
    if (productModel.prototype?.save) {
        productModel.prototype.save.mockReset();
    } else {
        productModel.prototype.save = jest.fn();
    }
});

// Тести для addInvoice
describe('addInvoice', () => {
    let mockReq;
    let mockRes;
    let mockInvoiceSave;
    const mockUserId = 'admin123';
    const mockAdminUser = { _id: mockUserId, firstName: 'Admin', secondName: 'Test' };
    const mockSupplierId = 'supplier1';
    const mockProductId1 = 'prod1';
    const mockProductId2 = 'prod2';
    let mockProduct1;
    let mockProduct2;

    beforeEach(() => {
        mockInvoiceSave = jest.fn().mockResolvedValue({ _id: 'newInvoiceId', invoiceNumber: 'INV-000001' });
        invoiceModel.mockImplementation(() => ({ save: mockInvoiceSave }));

        const mockSort = jest.fn().mockResolvedValue({ invoiceNumber: 'INV-000005' });
        invoiceModel.findOne.mockImplementation(() => ({
            sort: mockSort
        }));

        supplierModel.findById.mockResolvedValue({ _id: mockSupplierId, companyName: 'Постач Тест' });

        mockProduct1 = { _id: mockProductId1, name: 'Товар 1', sizes: [{ size: 'M', quantity: 10 }] };
        mockProduct2 = { _id: mockProductId2, name: 'Товар 2', sizes: [{ size: 'L', quantity: 5 }] };
        productModel.findById.mockImplementation(id => {
            if (id === mockProductId1) return Promise.resolve(mockProduct1);
            if (id === mockProductId2) return Promise.resolve(mockProduct2);
            return Promise.resolve(null);
        });

        mockReq = {
            body: {
                supplier: mockSupplierId,
                products: [
                    { product: mockProductId1, size: 'M', quantity: 5, purchasePrice: 50 },
                    { product: mockProductId2, size: 'L', quantity: 2, purchasePrice: 70 },
                ],
                totalAmount: (5 * 50) + (2 * 70),
                notes: 'Тестова накладна',
            },
            user: mockAdminUser,
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
    });

    it('TCIW01 - має успішно додати накладну з валідними даними', async () => {
        await addInvoice(mockReq, mockRes);

        expect(supplierModel.findById).toHaveBeenCalledWith(mockSupplierId);
        expect(productModel.findById).toHaveBeenCalledWith(mockProductId1);
        expect(productModel.findById).toHaveBeenCalledWith(mockProductId2);
        expect(productModel.findById).toHaveBeenCalledTimes(2);

        expect(invoiceModel.findOne).toHaveBeenCalledWith();

        expect(invoiceModel).toHaveBeenCalledWith(expect.objectContaining({
            invoiceNumber: 'INV-000006',
            supplier: mockSupplierId,
            products: mockReq.body.products,
            totalAmount: 390,
            notes: 'Тестова накладна',
            createdBy: { userId: mockUserId, name: 'Admin Test' },
            changesHistory: expect.any(Array),
        }));

        const constructorArgs = invoiceModel.mock.calls[0][0];
        expect(constructorArgs.changesHistory).toHaveLength(1);
        expect(constructorArgs.changesHistory[0]).toEqual(expect.objectContaining({
            changedBy: { userId: mockUserId, name: 'Admin Test' },
            changes: { action: "created", message: "Накладна була створена" }
        }));

        expect(mockInvoiceSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true, message: "Накладну додано"
        }));
    });

    it('TCIW02 - має повернути 400, якщо не ідентифіковано користувача', async () => {
        mockReq.user = null;
        await addInvoice(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Не вдалося ідентифікувати користувача, який редагує" });
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    test.each([
        ['TCIW03', 'supplier', "Будь ласка, оберіть постачальника", undefined],
        ['TCIW04', 'products', "Будь ласка, додайте товари до накладної", []],
        ['TCIW05', 'totalAmount', "Загальна сума накладної некоректна", -10],
    ])('%s - має повернути 400, якщо поле "%s" відсутнє або некоректне', async (testId, field, message, value) => {
        const testReq = {
            ...mockReq,
            body: {
                ...mockReq.body,
                [field]: value
            }
        };

        if (value === undefined) {
            delete testReq.body[field];
        }

        await addInvoice(testReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message
        });
        expect(mockInvoiceSave).not.toHaveBeenCalled();

        mockRes.status.mockClear();
        mockRes.json.mockClear();
    });

    it('TCIW06 - має повернути 404, якщо постачальника не знайдено', async () => {
        supplierModel.findById.mockResolvedValue(null);
        await addInvoice(mockReq, mockRes);
        expect(supplierModel.findById).toHaveBeenCalledWith(mockSupplierId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Постачальника не знайдено" });
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    it('TCIW07 - має повернути 404, якщо один з товарів не знайдено', async () => {
        productModel.findById.mockImplementation(id => {
            if (id === mockProductId1) return Promise.resolve(mockProduct1);
            return Promise.resolve(null);
        });
        await addInvoice(mockReq, mockRes);
        expect(productModel.findById).toHaveBeenCalledTimes(2);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: `Товар з ID ${mockProductId2} не знайдено` });
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    it('TCIW08 - має повернути 400, якщо розмір товару не знайдено', async () => {
        mockReq.body.products[0].size = 'XL';
        await addInvoice(mockReq, mockRes);
        expect(productModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: `Розмір XL не знайдено для товару ${mockProduct1.name}` });
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    it('TCIW09 - має повернути 500, якщо сталася помилка збереження накладної', async () => {
        const dbError = new Error('Invoice Save Error');
        mockInvoiceSave.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await addInvoice(mockReq, mockRes);
        expect(mockInvoiceSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: "Помилка при додаванні накладної" }));
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });

    it('має коректно згенерувати перший номер INV-000001', async () => {
        const mockSort = jest.fn().mockResolvedValue(null);
        invoiceModel.findOne.mockImplementation(() => ({ sort: mockSort }));

        await addInvoice(mockReq, mockRes);
        expect(invoiceModel).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: 'INV-000001' }));
        expect(mockInvoiceSave).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});

// Тести для fetchInvoices
describe('fetchInvoices', () => {
    let mockReq;
    let mockRes;
    let mockPopulateSupplier;
    let mockPopulateProduct;

    beforeEach(() => {
        mockReq = {};
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };

        mockPopulateProduct = jest.fn().mockResolvedValue([
            { _id: 'inv1', invoiceNumber: 'INV-001', supplier: { name: 'S1' }, products: [{ product: { name: 'P1' } }] },
            { _id: 'inv2', invoiceNumber: 'INV-002', supplier: { name: 'S2' }, products: [{ product: { name: 'P2' } }] },
        ]);
        mockPopulateSupplier = jest.fn(() => ({
            populate: mockPopulateProduct,
        }));
        invoiceModel.find.mockImplementation(() => ({
            populate: mockPopulateSupplier,
        }));
    });

    it('TCIR01 - має успішно повернути список накладних з populate', async () => {
        await fetchInvoices(mockReq, mockRes);

        expect(invoiceModel.find).toHaveBeenCalledWith({});
        expect(mockPopulateSupplier).toHaveBeenCalledWith('supplier');
        expect(mockPopulateProduct).toHaveBeenCalledWith('products.product');
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
    });

    it('TCIR02 - має повернути 500 при помилці populate', async () => {
        const dbError = new Error('Populate Error');
        mockPopulateProduct.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await fetchInvoices(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при отриманні накладних", error: dbError.message });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для editInvoice
describe('editInvoice', () => {
    let mockReq;
    let mockRes;
    const invoiceId = 'invoice123';
    const mockUserId = 'editorUserId';
    const mockEditorUser = { _id: mockUserId, firstName: 'Editor', secondName: 'User' };
    let mockExistingInvoiceData;
    let mockPopulateProductForFindById;

    beforeEach(() => {
        mockPopulateProductForFindById = jest.fn();

        mockExistingInvoiceData = {
            _id: invoiceId,
            supplier: 'supplierOld',
            products: [
                { product: { _id: 'p1', name: 'Товар 1' }, size: 'M', quantity: 5, purchasePrice: 10, toObject: () => ({ product: { _id: 'p1', name: 'Товар 1' }, size: 'M', quantity: 5, purchasePrice: 10 }) },
                { product: { _id: 'p2', name: 'Товар 2' }, size: 'L', quantity: 2, purchasePrice: 20, toObject: () => ({ product: { _id: 'p2', name: 'Товар 2' }, size: 'L', quantity: 2, purchasePrice: 20 }) },
            ],
            totalAmount: 90,
            notes: 'Старі нотатки',
            status: 'активна',
            changesHistory: [],
            toObject: () => ({
                _id: invoiceId,
                supplier: 'supplierOld',
                products: [
                    { product: { _id: 'p1', name: 'Товар 1' }, size: 'M', quantity: 5, purchasePrice: 10 },
                    { product: { _id: 'p2', name: 'Товар 2' }, size: 'L', quantity: 2, purchasePrice: 20 },
                ],
                totalAmount: 90,
                notes: 'Старі нотатки',
                status: 'активна',
                changesHistory: [],
            })
        };

        mockReq = {
            body: {
                id: invoiceId,
                supplier: 'supplierNew',
                products: [
                    { product: 'p1', size: 'M', quantity: 7, purchasePrice: 10 },
                    { product: 'p3', size: 'S', quantity: 3, purchasePrice: 30 },
                ],
                totalAmount: 160,
                notes: 'Нові нотатки',
                status: 'виконана',
            },
            user: mockEditorUser,
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };

        invoiceModel.findById.mockImplementation(() => ({
            populate: mockPopulateProductForFindById.mockResolvedValue(mockExistingInvoiceData)
        }));

        productModel.findById.mockImplementation(id => {
            if (id === 'p1') return Promise.resolve({ _id: 'p1', name: 'Товар 1' });
            if (id === 'p3') return Promise.resolve({ _id: 'p3', name: 'Товар 3' });
            return Promise.resolve(null);
        });

        const mockUpdatedInvoice = {
            _id: invoiceId,
            supplier: { _id: 'supplierNew', name: 'Новий Постач' },
            products: [
                { product: { _id: 'p1', name: 'Товар 1' }, size: 'M', quantity: 7, purchasePrice: 10 },
                { product: { _id: 'p3', name: 'Товар 3' }, size: 'S', quantity: 3, purchasePrice: 30 },
            ],
            totalAmount: 160,
            notes: 'Нові нотатки',
            status: 'виконана',
            createdBy: { _id: 'user1', name: 'Creator' },
            changesHistory: [{ changedBy: { userId: { _id: mockUserId, name: 'Editor User' } } }],
            toObject: () => ({
                _id: invoiceId,
                supplier: { _id: 'supplierNew', name: 'Новий Постач' },
                products: [
                    { product: { _id: 'p1', name: 'Товар 1' }, size: 'M', quantity: 7, purchasePrice: 10 },
                    { product: { _id: 'p3', name: 'Товар 3' }, size: 'S', quantity: 3, purchasePrice: 30 },
                ],
                totalAmount: 160,
                notes: 'Нові нотатки',
                status: 'виконана',
                createdBy: { _id: 'user1', name: 'Creator' },
                changesHistory: [{ changedBy: { userId: { _id: mockUserId, name: 'Editor User' } } }],
            })
        };

        invoiceModel.findByIdAndUpdate.mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
                populate: jest.fn().mockImplementation(() => ({
                    populate: jest.fn().mockResolvedValue(mockUpdatedInvoice)
                }))
            }))
        }));
    });

    it('TCIW10 - має успішно оновити накладну та записати зміни', async () => {
        await editInvoice(mockReq, mockRes);

        expect(invoiceModel.findById).toHaveBeenCalledWith(invoiceId);
        expect(invoiceModel.findByIdAndUpdate).toHaveBeenCalledWith(
            invoiceId,
            expect.objectContaining({
                supplier: 'supplierNew',
                products: mockReq.body.products,
                totalAmount: 160,
                notes: 'Нові нотатки',
                status: 'виконана',
                $push: {
                    changesHistory: expect.objectContaining({
                        changedBy: { userId: mockUserId, name: 'Editor User' },
                        changes: expect.objectContaining({
                            supplier: { from: 'supplierOld', to: 'supplierNew' },
                            notes: { from: 'Старі нотатки', to: 'Нові нотатки' },
                            status: { from: 'активна', to: 'виконана' },
                            products: expect.objectContaining({
                                from: expect.any(Array),
                                to: expect.any(Array),
                            })
                        })
                    })
                }
            }),
            { new: true }
        );

        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            message: "Накладну оновлено",
            data: expect.objectContaining({
                _id: invoiceId,
                status: 'виконана',
                supplier: expect.objectContaining({ _id: 'supplierNew' }),
                products: expect.arrayContaining([
                    expect.objectContaining({ product: expect.objectContaining({ _id: 'p1' }) }),
                    expect.objectContaining({ product: expect.objectContaining({ _id: 'p3' }) })
                ]),
                changesHistory: expect.any(Array)
            }),
            changes: expect.objectContaining({
                supplier: expect.any(Object),
                notes: expect.any(Object),
                status: expect.any(Object),
                products: expect.any(Object)
            })
        });
    });

    it('TCIW11 - має повернути 400, якщо не ідентифіковано редактора', async () => {
        mockReq.user = null;
        await editInvoice(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Не вдалося ідентифікувати користувача, який редагує" });
        expect(invoiceModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCIW12 - має повернути 404, якщо накладну не знайдено', async () => {
        mockPopulateProductForFindById.mockResolvedValue(null);
        invoiceModel.findById.mockImplementation(() => ({
            populate: mockPopulateProductForFindById
        }));
        await editInvoice(mockReq, mockRes);
        expect(invoiceModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Накладну не знайдено" });
        expect(invoiceModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCIW13 - має повернути 500 при помилці оновлення в БД', async () => {
        const dbError = new Error('Update Error');
        invoiceModel.findByIdAndUpdate.mockImplementation(() => ({
            populate: () => ({
                populate: () => ({
                    populate: jest.fn().mockRejectedValue(dbError)
                })
            })
        }));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await editInvoice(mockReq, mockRes);
        expect(invoiceModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при редагуванні накладної", error: dbError.message });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для getInvoiceById
describe('getInvoiceById', () => {
    let mockReq;
    let mockRes;
    const invoiceId = 'invoice123';
    let mockPopulateProduct;
    let mockPopulateSupplier;

    beforeEach(() => {
        mockReq = { params: { id: invoiceId } };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };

        mockPopulateProduct = jest.fn().mockResolvedValue({ _id: invoiceId });
        mockPopulateSupplier = jest.fn(() => ({ populate: mockPopulateProduct }));
        invoiceModel.findById.mockImplementation(() => ({ populate: mockPopulateSupplier }));
    });

    it('TCIR03 - має успішно повернути накладну за ID', async () => {
        await getInvoiceById(mockReq, mockRes);

        expect(invoiceModel.findById).toHaveBeenCalledWith(invoiceId);
        expect(mockPopulateSupplier).toHaveBeenCalledWith('supplier');
        expect(mockPopulateProduct).toHaveBeenCalledWith('products.product');
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({ _id: invoiceId }) });
    });

    it('TCIR04 - має повернути 404, якщо накладну не знайдено', async () => {
        mockPopulateProduct.mockResolvedValue(null);
        await getInvoiceById(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Накладна не знайдена" });
    });

    it('TCIR05 - має повернути 500 при помилці бази даних', async () => {
        const dbError = new Error('FindById Error');
        mockPopulateProduct.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await getInvoiceById(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка сервера" });
        expect(consoleSpy).toHaveBeenCalledWith("Помилка при отриманні накладної:", dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для completeInvoice
describe('completeInvoice', () => {
    let mockReq;
    let mockRes;
    const invoiceId = 'invoice123';
    let mockInvoice;
    let mockProduct1;
    let mockProduct1Save;
    let mockProduct2;
    let mockProduct2Save;
    let mockInvoiceSave;

    beforeEach(() => {
        mockReq = { body: { id: invoiceId } };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };

        mockProduct1Save = jest.fn().mockResolvedValue(true);
        mockProduct2Save = jest.fn().mockResolvedValue(true);
        mockInvoiceSave = jest.fn().mockResolvedValue(true);

        mockInvoice = {
            _id: invoiceId,
            status: 'активна',
            products: [
                { product: 'p1', size: 'M', quantity: 5 },
                { product: 'p2', size: 'L', quantity: 2 },
            ],
            save: mockInvoiceSave,
        };
        mockProduct1 = {
            _id: 'p1',
            name: 'Товар 1',
            sizes: [{ size: 'M', quantity: 10 }, { size: 'S', quantity: 3 }],
            save: mockProduct1Save,
        };
        mockProduct2 = {
            _id: 'p2',
            name: 'Товар 2',
            sizes: [{ size: 'L', quantity: 5 }],
            save: mockProduct2Save,
        };

        invoiceModel.findById.mockResolvedValue(mockInvoice);
        productModel.findById.mockImplementation(id => {
            if (id === 'p1') return Promise.resolve(mockProduct1);
            if (id === 'p2') return Promise.resolve(mockProduct2);
            return Promise.resolve(null);
        });
    });

    it('TCIW14 - має успішно виконати накладну та оновити кількість товарів', async () => {
        await completeInvoice(mockReq, mockRes);

        expect(invoiceModel.findById).toHaveBeenCalledWith(invoiceId);
        expect(productModel.findById).toHaveBeenCalledWith('p1');
        expect(productModel.findById).toHaveBeenCalledWith('p2');
        expect(mockProduct1Save).toHaveBeenCalledTimes(1);
        expect(mockProduct2Save).toHaveBeenCalledTimes(1);
        expect(mockProduct1.sizes.find(s => s.size === 'M').quantity).toBe(15);
        expect(mockProduct2.sizes.find(s => s.size === 'L').quantity).toBe(7);
        expect(mockInvoiceSave).toHaveBeenCalledTimes(1);
        expect(mockInvoice.status).toBe('виконана');
        expect(mockInvoice.updatedAt).toBeInstanceOf(Date);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Накладу виконано та товари додано на склад"
        }));
    });

    it('TCIW15 - має повернути 404, якщо накладну не знайдено', async () => {
        invoiceModel.findById.mockResolvedValue(null);
        await completeInvoice(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Накладну не знайдено" });
        expect(productModel.findById).not.toHaveBeenCalled();
    });

    it('TCIW16 - має повернути 400, якщо накладна не активна', async () => {
        mockInvoice.status = 'виконана';
        invoiceModel.findById.mockResolvedValue(mockInvoice);
        await completeInvoice(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Накладна вже виконана" });
        expect(productModel.findById).not.toHaveBeenCalled();
    });

    it('TCIW17 - має повернути 404, якщо товар з накладної не знайдено', async () => {
        productModel.findById.mockImplementation(id => {
            if (id === 'p1') return Promise.resolve(null);
            return Promise.resolve(mockProduct2);
        });
        await completeInvoice(mockReq, mockRes);
        expect(productModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Товар з ID p1 не знайдено" });
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    it('TCIW18 - має повернути 400, якщо розмір товару не знайдено', async () => {
        mockInvoice.products[0].size = 'XL';
        await completeInvoice(mockReq, mockRes);
        expect(productModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Розмір XL не знайдено для товару Товар 1" });
        expect(mockProduct1Save).not.toHaveBeenCalled();
        expect(mockInvoiceSave).not.toHaveBeenCalled();
    });

    it('TCIW19 - має повернути 500 при помилці збереження товару', async () => {
        const productSaveError = new Error('Product Save Error');
        mockProduct1Save.mockRejectedValue(productSaveError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await completeInvoice(mockReq, mockRes);
        expect(mockProduct1Save).toHaveBeenCalledTimes(1);
        expect(mockInvoiceSave).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при виконанні накладної", error: productSaveError.message });
        expect(consoleSpy).toHaveBeenCalledWith(productSaveError);
        consoleSpy.mockRestore();
    });

    it('TCIW20 - має повернути 500 при помилці збереження накладної', async () => {
        const invoiceSaveError = new Error('Invoice Save Error');
        mockInvoiceSave.mockRejectedValue(invoiceSaveError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await completeInvoice(mockReq, mockRes);
        expect(mockProduct1Save).toHaveBeenCalledTimes(1);
        expect(mockProduct2Save).toHaveBeenCalledTimes(1);
        expect(mockInvoiceSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при виконанні накладної", error: invoiceSaveError.message });
        expect(consoleSpy).toHaveBeenCalledWith(invoiceSaveError);
        consoleSpy.mockRestore();
    });
});
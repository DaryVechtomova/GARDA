import {
    addSupplier,
    fetchSuppliers,
    removeSupplier,
    editSupplier,
} from '../../supplierController.js';
import supplierModel from '../../../models/supplierModel.js';
import invoiceModel from '../../../models/invoiceModel.js';

jest.mock('../../../models/supplierModel.js');
jest.mock('../../../models/invoiceModel.js');

beforeEach(() => {
    jest.clearAllMocks();
});

// Тести для addSupplier
describe('addSupplier', () => {
    let mockReq;
    let mockRes;
    let mockSave;

    beforeEach(() => {
        mockSave = jest.fn().mockResolvedValue({ _id: 'newSupplierId', companyName: 'Новий Постачальник' });
        supplierModel.mockImplementation(() => ({ save: mockSave }));
        supplierModel.findOne.mockResolvedValue(null);

        // Базовий валідний запит
        mockReq = {
            body: {
                companyName: 'ТестПостач',
                contactPerson: 'Іван Іванов',
                email: 'ivan@test.com',
                phone: '+380991234567',
                address: 'Вул. Тестова 1',
                city: 'Київ',
                country: 'Україна',
                productType: 'Тканини',
                status: 'активний',
                notes: 'Примітки',
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
    });

    it('TCSC01 - має успішно додати постачальника з валідними даними', async () => {
        await addSupplier(mockReq, mockRes);

        expect(supplierModel.findOne).toHaveBeenCalledWith({ companyName: 'ТестПостач' });
        expect(supplierModel).toHaveBeenCalledWith({
            companyName: 'ТестПостач',
            contactPerson: 'Іван Іванов',
            email: 'ivan@test.com',
            phone: '+380991234567',
            address: 'Вул. Тестова 1',
            city: 'Київ',
            country: 'Україна',
            productType: 'Тканини',
            status: 'активний',
            notes: 'Примітки',
        });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Постачальника додано" });
    });

    it('TCSC02 - має повернути 400, якщо компанія з такою назвою вже існує', async () => {
        supplierModel.findOne.mockResolvedValue({ _id: 'existingId' });
        await addSupplier(mockReq, mockRes);
        expect(supplierModel.findOne).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Компанія з такою назвою вже існує" });
        expect(mockSave).not.toHaveBeenCalled();
    });

    // Тести на валідацію обов'язкових полів
    test.each([
        ['companyName', 'Будь ласка, введіть назву компанії', 'TCSE03'],
        ['contactPerson', 'Будь ласка, введіть контактну особу', 'TCSE03'],
        ['email', 'Будь ласка, введіть email', 'TCSE03'],
        ['phone', 'Будь ласка, введіть телефон', 'TCSE03'],
        ['address', 'Будь ласка, введіть адресу', 'TCSE03'],
        ['city', 'Будь ласка, введіть місто', 'TCSE03'],
        ['country', 'Будь ласка, введіть країну', 'TCSE03'],
        ['productType', 'Будь ласка, оберіть тип продукції', 'TCSE04'],
        ['status', 'Будь ласка, оберіть статус', 'TCSE05'],
    ])('%s - має повернути 400, якщо відсутнє поле "%s"', async (field, message, testId) => {
        delete mockReq.body[field];
        await addSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message });
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('TCSE04 - має повернути 400, якщо productType не обрано', async () => {
        mockReq.body.productType = "Оберіть тип продукції";
        await addSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, оберіть тип продукції" });
    });

    it('TCSE05 - має повернути 400, якщо status не обрано', async () => {
        mockReq.body.status = "Оберіть статус";
        await addSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, оберіть статус" });
    });

    it('TCSE06 - має повернути 500, якщо сталася помилка збереження', async () => {
        const dbError = new Error('DB Save Error');
        mockSave.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await addSupplier(mockReq, mockRes);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при додаванні постачальника" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для fetchSuppliers
describe('fetchSuppliers', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {};
        mockRes = { json: jest.fn() };
    });

    it('TCSS01 - має успішно повернути список постачальників', async () => {
        const mockSuppliers = [
            { _id: 's1', companyName: 'Постач 1' },
            { _id: 's2', companyName: 'Постач 2' },
        ];
        supplierModel.find.mockResolvedValue(mockSuppliers);

        await fetchSuppliers(mockReq, mockRes);

        expect(supplierModel.find).toHaveBeenCalledWith({});
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockSuppliers });
    });

    it('TCSS02 - має повернути помилку 500, якщо find кидає помилку', async () => {
        const dbError = new Error('DB Find Error');
        supplierModel.find.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await fetchSuppliers(mockReq, mockRes);
        expect(supplierModel.find).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для removeSupplier
describe('removeSupplier', () => {
    let mockReq;
    let mockRes;
    const supplierId = 'supplier123';
    const mockSupplier = { _id: supplierId, companyName: 'Для Видалення' };

    beforeEach(() => {
        mockReq = { body: { id: supplierId } };
        mockRes = { json: jest.fn(), status: jest.fn(() => mockRes) };

        supplierModel.findById.mockResolvedValue(mockSupplier);
        invoiceModel.find.mockResolvedValue([]);
        supplierModel.findByIdAndDelete.mockResolvedValue({ _id: supplierId });
    });

    it('TCSD01 - має успішно видалити постачальника, якщо немає накладних', async () => {
        await removeSupplier(mockReq, mockRes);

        expect(supplierModel.findById).toHaveBeenCalledWith(supplierId);
        expect(invoiceModel.find).toHaveBeenCalledWith({ supplier: supplierId });
        expect(supplierModel.findByIdAndDelete).toHaveBeenCalledWith(supplierId);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Постачальника видалено" });
    });

    it('TCSD02 - має повернути 404, якщо постачальника не знайдено', async () => {
        supplierModel.findById.mockResolvedValue(null); // Не знайдено
        await removeSupplier(mockReq, mockRes);
        expect(supplierModel.findById).toHaveBeenCalledWith(supplierId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Постачальника не знайдено" });
        expect(invoiceModel.find).not.toHaveBeenCalled();
        expect(supplierModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('TCSD03 - має повернути 400, якщо у постачальника є накладні', async () => {
        invoiceModel.find.mockResolvedValue([{ _id: 'inv1' }]); // Знайдено накладні
        await removeSupplier(mockReq, mockRes);
        expect(supplierModel.findById).toHaveBeenCalledWith(supplierId);
        expect(invoiceModel.find).toHaveBeenCalledWith({ supplier: supplierId });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Не можна видалити постачальника, у якого є накладні" });
        expect(supplierModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('TCSD04 - має повернути 500, якщо сталася помилка при пошуку постачальника', async () => {
        const dbError = new Error('FindById Error');
        supplierModel.findById.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні постачальника" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });

    it('TCSD05 - має повернути 500, якщо сталася помилка при пошуку накладних', async () => {
        const dbError = new Error('Invoice Find Error');
        invoiceModel.find.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні постачальника" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });

    it('TCSD06 - має повернути 500, якщо сталася помилка при видаленні постачальника', async () => {
        const dbError = new Error('Delete Error');
        supplierModel.findByIdAndDelete.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await removeSupplier(mockReq, mockRes);
        expect(supplierModel.findByIdAndDelete).toHaveBeenCalledTimes(1); // Спроба була
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при видаленні постачальника" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

// Тести для editSupplier
describe('editSupplier', () => {
    let mockReq;
    let mockRes;
    const supplierId = 'supplier123';
    let mockExistingSupplier;

    beforeEach(() => {
        mockExistingSupplier = {
            _id: supplierId,
            companyName: 'Стара Компанія',
            contactPerson: 'Старий Контакт',
            email: 'old@test.com',
            phone: '+380990000000',
            address: 'Стара Адреса 1',
            city: 'Львів',
            country: 'Україна',
            productType: 'Нитки',
            status: 'активний',
            notes: 'Старі нотатки',
            cooperationEndDate: null,
        };
        mockReq = {
            body: {
                id: supplierId,
                companyName: 'Нова Компанія',
                contactPerson: 'Новий Контакт',
                email: 'new@test.com',
                phone: '+380991111111',
                address: 'Нова Адреса 1',
                city: 'Київ',
                country: 'Україна',
                productType: 'Тканини',
                status: 'активний',
                notes: 'Нові нотатки',
            },
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };

        supplierModel.findOne.mockResolvedValue(null);
        supplierModel.findById.mockResolvedValue(mockExistingSupplier);
        supplierModel.findByIdAndUpdate.mockImplementation((id, update, options) => {
            const updatedSupplier = {
                ...mockExistingSupplier,
                ...update,
                _id: supplierId
            };
            return Promise.resolve(updatedSupplier);
        });
    });

    it('TCSE01 - має успішно оновити постачальника без зміни статусу', async () => {
        await editSupplier(mockReq, mockRes);

        expect(supplierModel.findOne).toHaveBeenCalledWith({ companyName: 'Нова Компанія', _id: { $ne: supplierId } });
        expect(supplierModel.findById).toHaveBeenCalledWith(supplierId);

        // Оновлений очікуваний об'єкт - cooperationEndDate може бути null
        expect(supplierModel.findByIdAndUpdate).toHaveBeenCalledWith(
            supplierId,
            expect.objectContaining({
                companyName: 'Нова Компанія',
                contactPerson: 'Новий Контакт',
                email: 'new@test.com',
                phone: '+380991111111',
                address: 'Нова Адреса 1',
                city: 'Київ',
                country: 'Україна',
                productType: 'Тканини',
                status: 'активний',
                notes: 'Нові нотатки',
            }),
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true, message: "Постачальника оновлено"
        }));
    });

    it('TCSE02 - має скинути cooperationEndDate при зміні статусу з "завершений" на "активний"', async () => {
        const originalDate = new Date();
        mockExistingSupplier.status = 'завершений';
        mockExistingSupplier.cooperationEndDate = originalDate;
        mockReq.body.status = 'активний';

        supplierModel.findByIdAndUpdate.mockImplementation((id, update, options) => {
            return Promise.resolve({
                ...mockExistingSupplier,
                ...update,
                cooperationEndDate: "",
                _id: supplierId
            });
        });

        await editSupplier(mockReq, mockRes);

        expect(supplierModel.findById).toHaveBeenCalledWith(supplierId);
        expect(supplierModel.findByIdAndUpdate).toHaveBeenCalledWith(
            supplierId,
            expect.objectContaining({
                companyName: 'Нова Компанія',
                contactPerson: 'Новий Контакт',
                email: 'new@test.com',
                phone: '+380991111111',
                address: 'Нова Адреса 1',
                city: 'Київ',
                country: 'Україна',
                productType: 'Тканини',
                status: 'активний',
                notes: 'Нові нотатки',
                cooperationEndDate: ""
            }),
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('TCSEM03 - має повернути 400, якщо знайдено дублікат компанії (інший ID)', async () => {
        supplierModel.findOne.mockResolvedValue({ _id: 'anotherId' }); // Знайдено дублікат
        await editSupplier(mockReq, mockRes);
        expect(supplierModel.findOne).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Компанія з такою назвою вже існує" });
        expect(supplierModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test.each([
        ['companyName', 'Будь ласка, введіть назву компанії'],
        ['contactPerson', 'Будь ласка, введіть контактну особу'],
        ['email', 'Будь ласка, введіть email'],
    ])('TCSE04 - має повернути 400 при редагуванні, якщо відсутнє поле "%s"', async (field, message) => {
        delete mockReq.body[field];
        await editSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message });
        expect(supplierModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCSE05 - має повернути 404, якщо постачальника не знайдено (findById)', async () => {
        supplierModel.findById.mockResolvedValue(null);
        await editSupplier(mockReq, mockRes);
        expect(supplierModel.findOne).toHaveBeenCalledTimes(1);
        expect(supplierModel.findById).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Постачальника не знайдено" });
        expect(supplierModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCSE06 - має повернути 500 при помилці findByIdAndUpdate', async () => {
        const dbError = new Error('Update Error');
        supplierModel.findByIdAndUpdate.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await editSupplier(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка при редагуванні постачальника", error: dbError.message });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});
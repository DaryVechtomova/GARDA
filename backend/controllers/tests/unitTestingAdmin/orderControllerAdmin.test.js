import {
    listOrders,
    updateOrderStatus,
    cancelOrder,
    updateOrder,
} from '../../orderController.js';
import orderModel from '../../../models/orderModel.js';
import productModel from '../../../models/productModel.js';
import Stripe from "stripe";

jest.mock('../../../models/orderModel.js');
jest.mock('../../../models/productModel.js');
jest.mock('stripe', () => {
    const mStripe = jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({ url: 'mock_session_url', id: 'mock_session_id' }),
            }
        },
    }));
    return mStripe;
});
beforeEach(() => {
    jest.clearAllMocks();
});

describe('listOrders', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            json: jest.fn(),
        };
    });

    it('TCOS01 - має успішно повернути список усіх замовлень', async () => {
        const mockOrders = [
            { _id: 'order1', orderNumber: 123, status: 'Нове замовлення' },
            { _id: 'order2', orderNumber: 456, status: 'В обробці' },
        ];
        orderModel.find.mockResolvedValue(mockOrders);

        await listOrders(mockReq, mockRes);

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockOrders });
    });

    it('TCOS02 - має повернути помилку, якщо сталася помилка БД', async () => {
        const dbError = new Error('DB Find Error');
        orderModel.find.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await listOrders(mockReq, mockRes);

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Помилка" });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});

describe('updateOrderStatus', () => {
    let mockReq;
    let mockRes;
    const orderId = 'order123';
    const mockAdminUser = {
        _id: 'adminUserId',
        firstName: 'Адміністратор',
        secondName: 'Тест',
    };
    let mockOrder;

    beforeEach(() => {
        mockReq = {
            params: { orderId: orderId },
            body: { status: 'В обробці' },
            user: mockAdminUser,
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
        mockOrder = {
            _id: orderId,
            status: 'Нове замовлення',
            editHistory: [],
        };
        orderModel.findById.mockResolvedValue(mockOrder);
        orderModel.findByIdAndUpdate.mockResolvedValue({ ...mockOrder, status: mockReq.body.status });
    });

    it('TCOU01 - має успішно оновити статус замовлення', async () => {
        await updateOrderStatus(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            orderId,
            {
                status: 'В обробці',
                $push: {
                    editHistory: expect.objectContaining({
                        editedBy: expect.objectContaining({
                            userId: mockAdminUser._id,
                            name: `${mockAdminUser.firstName} ${mockAdminUser.secondName}`
                        }),
                        oldStatus: 'Нове замовлення',
                        newStatus: 'В обробці',
                        type: 'status_change',
                        date: expect.any(Date),
                    })
                }
            },
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Статус замовлення оновлено",
            data: expect.objectContaining({ status: 'В обробці' }),
        }));
    });

    it('TCOU02 - має повернути 404, якщо замовлення не знайдено', async () => {
        orderModel.findById.mockResolvedValue(null);

        await updateOrderStatus(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Замовлення не знайдено" });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCOU03 - має повернути 500 при помилці оновлення в БД', async () => {
        const dbError = new Error('Update Error');
        orderModel.findByIdAndUpdate.mockRejectedValue(dbError);

        await updateOrderStatus(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при оновленні статусу",
            error: dbError.message,
        });
    });
});

describe('cancelOrder', () => {
    let mockReq;
    let mockRes;
    const orderId = 'order123';
    const mockAdminUser = {
        _id: 'adminUserId',
        firstName: 'Admin',
        secondName: 'User',
        name: 'Admin User'
    };
    let mockOrderNew;
    let mockOrderProcessing;

    beforeEach(() => {
        mockReq = {
            params: { orderId: orderId },
            body: { reason: 'Клієнт попросив' },
            user: mockAdminUser,
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
        mockOrderNew = {
            _id: orderId,
            status: 'Нове замовлення',
            items: [{ productId: 'p1', size: 'M', quantity: 1 }],
            editHistory: [],
        };
        mockOrderProcessing = {
            _id: orderId,
            status: 'В обробці',
            items: [{ productId: 'p2', size: 'L', quantity: 2 }],
            editHistory: [],
        };
        orderModel.findById.mockResolvedValue(mockOrderNew);
        orderModel.findByIdAndUpdate.mockResolvedValue({ ...mockOrderNew, status: 'Скасовано' });
        productModel.findByIdAndUpdate.mockResolvedValue(true);
    });

    it('TCOC01 - має успішно скасувати "Нове замовлення" (без повернення товару)', async () => {
        await cancelOrder(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            orderId,
            {
                status: "Скасовано",
                cancellationReason: 'Клієнт попросив',
                $push: {
                    editHistory: expect.objectContaining({
                        type: 'status_change',
                        oldStatus: 'Нове замовлення',
                        newStatus: 'Скасовано',
                        reason: 'Клієнт попросив',
                        editedBy: expect.objectContaining({
                            userId: mockAdminUser._id,
                            name: mockAdminUser.name
                        }),
                    })
                }
            },
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true, message: "Замовлення успішно скасовано"
        }));
    });

    it('TCOC02 - має успішно скасувати замовлення "В обробці" і повернути товар', async () => {
        orderModel.findById.mockResolvedValue(mockOrderProcessing);

        await cancelOrder(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            'p2',
            { $inc: { "sizes.$[elem].quantity": 2 } },
            { arrayFilters: [{ "elem.size": 'L' }] }
        );
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('TCOE03 - має повернути 404, якщо замовлення не знайдено', async () => {
        orderModel.findById.mockResolvedValue(null);
        await cancelOrder(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Замовлення не знайдено" });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCOE04 - має повернути 400, якщо статус замовлення не дозволяє скасування', async () => {
        mockOrderNew.status = 'Доставлено';
        orderModel.findById.mockResolvedValue(mockOrderNew);
        await cancelOrder(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Замовлення можна скасувати тільки зі статусом 'Нове замовлення' або 'В обробці'"
        });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCOE06 - має повернути 500 при помилці скасування замовлення', async () => {
        const dbError = new Error('Update Error');
        orderModel.findByIdAndUpdate.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await cancelOrder(mockReq, mockRes);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });

    it('TCOE05 - має повернути 500 при помилці повернення товару на склад', async () => {
        orderModel.findById.mockResolvedValue(mockOrderProcessing);
        const productError = new Error('Product Update Error');
        productModel.findByIdAndUpdate.mockRejectedValue(productError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await cancelOrder(mockReq, mockRes);
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при скасуванні замовлення"
        });
        expect(consoleSpy).toHaveBeenCalledWith(productError);
        consoleSpy.mockRestore();
    });
});

describe('updateOrder', () => {
    let mockReq;
    let mockRes;
    const orderId = 'order123';
    const mockAdminUser = {
        _id: 'adminUserId',
        firstName: 'Admin',
        secondName: 'Update',
        name: 'Admin Update'
    };
    let mockOrder;

    beforeEach(() => {
        mockOrder = {
            _id: orderId,
            status: 'В обробці',
            amount: 250,
            items: [
                { productId: 'p1', name: 'Товар 1', size: 'M', quantity: 1, price: 100 },
                { productId: 'p2', name: 'Товар 2', size: 'L', quantity: 1, price: 150 },
            ],
            editHistory: [],
        };
        mockReq = {
            params: { id: orderId },
            body: {
                editReason: 'Зміна кількості та видалення',
                amount: 200,
                items: [
                    { productId: 'p1', name: 'Товар 1', size: 'M', quantity: 2, price: 100 },
                    { productId: 'p3', name: 'Товар 3', size: 'S', quantity: 1, price: 50 },
                ]
            },
            user: mockAdminUser,
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn(() => mockRes),
        };
        orderModel.findById.mockResolvedValue(mockOrder);
        orderModel.findByIdAndUpdate.mockResolvedValue({ ...mockOrder, ...mockReq.body });
    });

    it('TCOM01 - має успішно оновити замовлення та записати зміни', async () => {
        await updateOrder(mockReq, mockRes);

        expect(orderModel.findById).toHaveBeenCalledWith(orderId);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            orderId,
            expect.objectContaining({
                items: mockReq.body.items,
                amount: 200,
                $push: {
                    editHistory: expect.objectContaining({
                        reason: 'Зміна кількості та видалення',
                        type: 'order_edit',
                        editedBy: expect.objectContaining({
                            userId: mockAdminUser._id,
                            name: mockAdminUser.name
                        }),
                        changes: expect.objectContaining({
                            amountChanged: true,
                            oldAmount: 250,
                            newAmount: 200,
                            items: expect.arrayContaining([
                                expect.objectContaining({ action: 'quantity_changed', productId: 'p1' }),
                                expect.objectContaining({ action: 'removed', productId: 'p2' }),
                                expect.objectContaining({ action: 'added', productId: 'p3' }),
                            ])
                        })
                    })
                }
            }),
            { new: true }
        );
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true, message: "Замовлення успішно оновлено"
        }));
    });

    it('TCOM02 - має повернути 404, якщо замовлення не знайдено', async () => {
        orderModel.findById.mockResolvedValue(null);
        await updateOrder(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Замовлення не знайдено" });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCOM03 - має повернути 400, якщо не вказано причину редагування', async () => {
        delete mockReq.body.editReason;
        await updateOrder(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Будь ласка, оберіть причину редагування" });
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('TCOM04 - має повернути 400, якщо не вдалося ідентифікувати редактора', async () => {
        mockReq.user = null;
        await updateOrder(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Не вдалося ідентифікувати користувача, який редагує" });
        expect(orderModel.findById).not.toHaveBeenCalled();
    });

    it('TCOM05 - має повернути 500 при помилці оновлення в БД', async () => {
        const dbError = new Error('Update Error');
        orderModel.findByIdAndUpdate.mockRejectedValue(dbError);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await updateOrder(mockReq, mockRes);
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: "Помилка при оновленні замовлення",
            error: dbError.message
        });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
});
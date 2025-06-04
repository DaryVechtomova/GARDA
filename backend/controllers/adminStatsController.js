const Order = require('../models/orderModel.js');
const User = require('../models/userModel.js');
const Product = require('../models/productModel.js');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11 (січень - 0, грудень - 11)

        // Дати для "сьогодні"
        const startOfToday = new Date(currentYear, currentMonth, today.getDate());
        const endOfToday = new Date(currentYear, currentMonth, today.getDate() + 1);

        // Дати для "цього тижня" (понеділок - початок наступного понеділка)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay(); // 0 (неділя) - 6 (субота)
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(today.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        // Дати для "поточного місяця"
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 1);

        const totalOrders = await Order.countDocuments({});
        const ordersToday = await Order.countDocuments({
            date: { $gte: startOfToday, $lt: endOfToday }
        });
        const ordersThisWeek = await Order.countDocuments({
            date: { $gte: startOfWeek, $lt: endOfWeek }
        });

        const saleStatuses = [
            "В обробці",
            "Передано в службу доставки",
            "Чекає на отримання",
            "Доставлено"
            // "Нове замовлення" та "Скасовано" не включаємо
        ];

        const salesDataThisMonth = await Order.aggregate([
            {
                $match: {
                    status: { $in: saleStatuses },
                    date: { $gte: startOfMonth, $lt: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSalesMonth: { $sum: "$amount" }
                }
            }
        ]);
        const totalSalesThisMonthValue = salesDataThisMonth.length > 0 ? salesDataThisMonth[0].totalSalesMonth : 0;

        const totalUsers = await User.countDocuments({ role: 'користувач' });

        res.json({
            success: true,
            data: {
                totalOrders,
                ordersToday,
                ordersThisWeek,
                totalSalesMonth: totalSalesThisMonthValue,
                totalUsers
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ success: false, message: "Error fetching statistics", error: error.message });
    }
};

exports.getPopularProducts = async (req, res) => {
    console.log("--- getPopularProducts: Start ---");
    try {
        const limit = parseInt(req.query.limit) || 5;
        const days = parseInt(req.query.days) || 30;
        console.log(`Params: limit=${limit}, days=${days}`);

        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        dateFrom.setHours(0, 0, 0, 0);
        console.log(`Date from: ${dateFrom.toISOString()}`);

        // Етап 1: Фільтрація замовлень та розгортання товарів
        console.log("Aggregate Stage 1: $match orders and $unwind items");
        const matchedAndUnwoundOrders = await Order.aggregate([
            {
                $match: {
                    date: { $gte: dateFrom },
                }
            },
            { $unwind: "$items" }
        ]);
        console.log(`Stage 1 Result (matchedAndUnwoundOrders count): ${matchedAndUnwoundOrders.length}`);
        if (matchedAndUnwoundOrders.length === 0) {
            console.log("No orders found matching criteria or no items in orders.");
            return res.json({ success: true, data: [] }); // Повертаємо порожній масив, якщо немає даних
        }
        console.log("Sample of Stage 1 result:", matchedAndUnwoundOrders.slice(0, 2)); // Лог перших кількох результатів

        // Етап 2: Групування товарів та підрахунок продажів
        console.log("Aggregate Stage 2: $group by productId and sum quantity");
        const groupedProducts = await Order.aggregate([
            {
                $match: {
                    date: { $gte: dateFrom },
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" }
                }
            }
        ]);
        console.log(`Stage 2 Result (groupedProducts count): ${groupedProducts.length}`);
        if (groupedProducts.length === 0) {
            console.log("No products could be grouped. Check if items.productId and items.quantity exist and are correct.");
            return res.json({ success: true, data: [] });
        }
        console.log("Sample of Stage 2 result:", groupedProducts.slice(0, 2));

        // Етап 3: Сортування та обмеження
        console.log("Aggregate Stage 3: $sort and $limit");
        const sortedAndLimitedProducts = await Order.aggregate([
            {
                $match: {
                    date: { $gte: dateFrom },
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit }
        ]);
        console.log(`Stage 3 Result (sortedAndLimitedProducts count): ${sortedAndLimitedProducts.length}`);
        if (sortedAndLimitedProducts.length === 0) {
            console.log("Products were grouped but result became empty after sort/limit. This is unusual unless groupedProducts was empty.");
            return res.json({ success: true, data: [] });
        }
        console.log("Sample of Stage 3 result:", sortedAndLimitedProducts.slice(0, 2));

        // Етап 4: Повний агрегаційний запит з $lookup та $project (як у тебе було)
        console.log("Aggregate Stage 4: Full aggregation with $lookup and $project");
        const popularProductsData = await Order.aggregate([
            {
                $match: {
                    date: { $gte: dateFrom },
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit },
            {
                $addFields: {
                    convertedProductId: { $toObjectId: "$_id" } // Конвертуємо рядок _id в ObjectId
                }
            },
            {
                $lookup: {
                    from: Product.collection.name,
                    localField: "convertedProductId", // Це productId з попереднього етапу
                    foreignField: "_id", // Це _id з колекції Product
                    as: "productDetails"
                }
            },
            {
                $addFields: { // Додаємо поле для перевірки, чи productDetails не порожній
                    productFound: { $gt: [{ $size: "$productDetails" }, 0] }
                }
            },
            { $unwind: "$productDetails" }, // Якщо productDetails порожній, документи тут відфільтруються!
            {
                $project: {
                    _id: 1,
                    totalSold: 1,
                    name: "$productDetails.name",
                    image: { $ifNull: [{ $arrayElemAt: ["$productDetails.images", 0] }, null] }, // Додано $ifNull для безпеки
                    // productFound: 1 // Можна залишити для дебагу
                }
            }
        ]);

        console.log(`Final Result (popularProductsData count): ${popularProductsData.length}`);
        if (popularProductsData.length > 0) {
            console.log("Sample of Final Result:", JSON.stringify(popularProductsData.slice(0, 2), null, 2));
        } else {
            console.log("Final result is empty. Possible reasons: no matching orders, items not grouped, or $lookup did not find matching products, or productDetails was empty causing $unwind to filter out documents.");
        }

        console.log("--- getPopularProducts: End (Success) ---");
        res.json({ success: true, data: popularProductsData });

    } catch (error) {
        console.error("--- getPopularProducts: End (Error) ---");
        console.error("Error fetching popular products:", error);
        res.status(500).json({ success: false, message: "Error fetching popular products", error: error.message });
    }
};
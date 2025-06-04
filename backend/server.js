if (process.env.NODE_ENV !== 'production') {
    require('dotenv/config.js');
    console.log("!!! Завантажено .env файл (режим розробки) !!!");
}
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db.js');
const productRouter = require('./routes/productRoute.js');
const userRouter = require('./routes/userRoute.js');
const cartRouter = require('./routes/cartRoute.js');
const orderRouter = require('./routes/orderRoute.js');
const supplierRouter = require('./routes/supplierRoute.js');
const invoiceRouter = require('./routes/invoiceRoute.js');
const reviewRouter = require('./routes/reviewRoute.js');
const favouriteRouter = require('./routes/favouriteRoute.js');
const adminStatsRouter = require('./routes/adminStatsRoute.js');
const { authMiddleware, adminMiddleware } = require('./middleware/auth.js');

//app config
const app = express()
const port = 4000

// middleware
app.use(express.json())
app.use(cors())

// db connection
connectDB();

// api endpoints

app.use("/api/product", productRouter)
if (process.env.NODE_ENV === 'test') {
    app.use("/test-images", express.static('test-uploads'));
} else {
    app.use("/images", express.static('uploads'));
}
app.use("/api/user", userRouter)
app.use("/api/cart", cartRouter)
app.use("/api/order", orderRouter)
app.use("/api/suppliers", supplierRouter)
app.use("/api/invoices", invoiceRouter)
app.use("/api/review", reviewRouter)
app.use("/api/favourite", favouriteRouter)
app.use("/api/admin-stats", adminStatsRouter)

// Маршрут для адмін-панелі
// app.get("/admin/dashboard", authMiddleware, adminMiddleware, (req, res) => {
//     res.json({ success: true, message: "Ласкаво просимо в адмін-панель!" });
// });

app.get("/", (req, res) => {
    res.send("API Working")
})

// app.listen(port, () => {
//     console.log(`Server started on http://localhost:${port}`)
// })

module.exports = { app };

// Запускаємо сервер тільки якщо це не тестовий режим
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server started on http://localhost:${port}`)
    })
}
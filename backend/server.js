import 'dotenv/config.js'
import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import productRouter from "./routes/productRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import supplierRouter from './routes/supplierRoute.js';
import invoiceRouter from './routes/invoiceRoute.js';
import { authMiddleware, adminMiddleware } from "./middleware/auth.js"; // Імпорт middleware
import reviewRoute from './routes/reviewRoute.js';


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
app.use("/images", express.static('uploads'))
app.use("/api/user", userRouter)
app.use("/api/cart", cartRouter)
app.use("/api/order", orderRouter)
app.use("/api/suppliers", supplierRouter)
app.use("/api/invoices", invoiceRouter)
app.use("/api/review", reviewRoute)

// Маршрут для адмін-панелі
// app.get("/admin/dashboard", authMiddleware, adminMiddleware, (req, res) => {
//     res.json({ success: true, message: "Ласкаво просимо в адмін-панель!" });
// });

app.get("/", (req, res) => {
    res.send("API Working")
})

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`)
})
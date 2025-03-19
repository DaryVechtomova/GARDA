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

app.get("/", (req, res) => {
    res.send("API Working")
})

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`)
})
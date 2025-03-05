import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://dvvechtomova:NRLNskPzBEJ6ZgBn@cluster0.m4tuo.mongodb.net/GARDA?retryWrites=true&w=majority&appName=Cluster0').then((() => console.log("DB Connected")))
}
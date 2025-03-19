import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AddProduct from "./pages/AddProduct";
import ProductList from "./pages/ProductList";
import Orders from "./pages/Orders";
import EditProduct from "./pages/EditProduct";
import ProductDetails from "./pages/ProductDetails";
import OrderDetails from "./pages/OrderDetails";
import SupplierList from "./pages/SuppliersList";
import AddSupplier from "./pages/AddSupplier";
import EditSupplier from "./pages/EditSupplier";
import SupplierDetails from "./pages/SupplierDetails";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Navbar />
      <hr />
      <div className="flex max-padd-container pt-2">
        <Sidebar />
        <Routes>
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/list-product" element={<ProductList />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/product/details/:id" element={<ProductDetails />} />
          <Route path="/order/details/:id" element={<OrderDetails />} />
          <Route path="/list-supplier" element={<SupplierList />} />
          <Route path="/add-supplier" element={<AddSupplier />} />
          <Route path="/edit-supplier/:id" element={<EditSupplier />} />
          <Route path="/suppliers/details/:id" element={<SupplierDetails />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
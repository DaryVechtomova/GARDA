import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Order from "./pages/Order";
import Footer from "./components/Footer";
import LoginPopup from "./components/LoginPopup";
import SearchPage from './pages/SearchPage';
import ChangePassword from "./pages/ChangePassword"
import MyOrders from "./pages/MyOrders";
import CatalogPage from './pages/CatalogPage';
import { useState } from "react";
import { useNavigate } from "react-router";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [showLogin, setShowLogin] = useState(false)
  // const navigate = useNavigate();

  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   const role = localStorage.getItem("role");

  //   if (token && role && role !== "користувач") {
  //     window.location.href = "/GARDA/admin_panel";
  //   }
  // }, [navigate]);
  return (
    <BrowserRouter basename="/GARDA">
      <ToastContainer />
      {showLogin ? <LoginPopup setShowLogin={setShowLogin} /> : <></>}
      <Header setShowLogin={setShowLogin} />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Маршрут для каталогу з параметром категорії */}
        <Route path='/catalog/:category' element={<CatalogPage />} />
        {/* Можна додати маршрут /catalog без параметра, який показує всі товари */}
        <Route path='/catalog' element={<CatalogPage />} />
        <Route path="/product/:productId" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/order" element={<Order />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="/my-orders" element={<MyOrders />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

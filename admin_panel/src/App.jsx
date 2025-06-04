import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AddProduct from "./pages/AddProduct";
import ProductList from "./pages/ProductList";
import Orders from "./pages/Orders";
import EditProduct from "./pages/EditProduct";
import ProductDetails from "./pages/ProductDetails";
import OrderDetails from "./pages/OrderDetails";
import EditOrder from "./pages/EditOrder";
import SupplierList from "./pages/SuppliersList";
import AddSupplier from "./pages/AddSupplier";
import EditSupplier from "./pages/EditSupplier";
import SupplierDetails from "./pages/SupplierDetails";
import InvoiceList from "./pages/InvoiceList";
import AddInvoice from "./pages/AddInvoice";
import EditInvoice from "./pages/EditInvoice";
import InvoiceDetails from "./pages/InvoiceDetails";
import EmployeesList from "./pages/EmployeesList";
import AddEmployee from "./pages/AddEmployee";
import EditEmployee from "./pages/EditEmployee";
import EmployeeDetails from "./pages/EmployeeDetails";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";

const frontendBaseUrl =
  import.meta.env.VITE_FRONTEND_BASE_URL || "http://localhost:5173/GARDA";
const API_URL = "http://localhost:4000";

const frontendLoginUrl = `${frontendBaseUrl}/GARDA`;
const frontendProfileUrl = `${frontendBaseUrl}/GARDA/profile`;

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехоплювач для відповідей
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUserData");
      window.location.href = frontendLoginUrl;
    }
    return Promise.reject(error);
  }
);

const fetchUserData = async (token) => {
  console.log(token);
  if (!token) return null;
  try {
    // Запит на бекенд для отримання даних поточного користувача
    const response = await axios.get(`${API_URL}/api/user/me`);
    if (response.data.success) {
      return response.data.userData;
    } else {
      console.error(
        "Помилка отримання даних користувача:",
        response.data.message
      );
      return null;
    }
  } catch (error) {
    console.error("Помилка мережі при отриманні даних користувача:", error);
    if (error.response && error.response.status === 401) {
      console.error("Токен недійсний або термін дії закінчився.");
    }
    return null;
  }
};

const AuthWrapper = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthWrapper: Перевірка...");

    // 1. Перевіряємо токен в URL
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get("token");
    let currentToken = localStorage.getItem("adminToken"); // Використовуємо інший ключ для адмінки

    if (urlToken) {
      console.log("AuthWrapper: Знайдено токен в URL. Зберігаємо...");
      currentToken = urlToken;
      localStorage.setItem("adminToken", currentToken);
      localStorage.removeItem("adminUserData");
      window.history.replaceState({}, document.title, location.pathname);
    }

    // 2. Перевіряємо наявність та валідність токена (з URL або localStorage)
    if (!currentToken) {
      console.log(
        "AuthWrapper: Токен не знайдено. Перенаправлення на логін фронтенду."
      );
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUserData");
      window.location.href = frontendLoginUrl;
      return;
    }

    // 3. Декодуємо токен, щоб отримати роль
    try {
      const decodedToken = jwtDecode(currentToken);
      const role = decodedToken.role;

      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        throw new Error("Token expired");
      }

      console.log("AuthWrapper: Декодована роль:", role);

      if (
        role === "адміністратор" ||
        role === "комірник" ||
        role === "менеджер з продажу"
      ) {
        // Роль підходить
        console.log("AuthWrapper: Авторизація успішна.");
        setIsAuthorized(true);
      } else {
        // Роль не підходить
        console.log(
          "AuthWrapper: Неправильна роль. Перенаправлення на профіль фронтенду."
        );
        localStorage.removeItem("adminToken"); // Видаляємо невалідний токен
        localStorage.removeItem("adminUserData");
        window.location.href = frontendProfileUrl;
        return; // Зупиняємо виконання
      }
    } catch (error) {
      console.error(
        "AuthWrapper: Помилка декодування токена або термін дії закінчився:",
        error
      );
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUserData");
      window.location.href = frontendLoginUrl;
      return;
    }

    setIsLoading(false);
  }, [location.search, navigate, location.pathname]);

  if (isLoading) {
    return <div>Перевірка авторизації...</div>;
  }

  if (!isAuthorized) {
    return <div>Не авторизовано.</div>;
  }

  return children;
};

// --- AdminLayout ---
const AdminLayout = () => {
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingUser(true);
      const storedUserData = localStorage.getItem("adminUserData");
      let token = localStorage.getItem("adminToken");

      if (storedUserData) {
        try {
          setUserData(JSON.parse(storedUserData));
          setIsLoadingUser(false);
          console.log(
            "AdminLayout: Дані користувача завантажено з localStorage."
          );
          return;
        } catch (e) {
          console.error("Помилка парсингу userData з localStorage", e);
          localStorage.removeItem("adminUserData");
        }
      }

      if (token) {
        console.log("AdminLayout: Запит даних користувача з бекенду...");
        const fetchedData = await fetchUserData(token);
        if (fetchedData) {
          setUserData(fetchedData);
          localStorage.setItem("adminUserData", JSON.stringify(fetchedData));
          console.log("AdminLayout: Дані користувача отримано та збережено.");
        } else {
          console.error(
            "AdminLayout: Не вдалося завантажити дані користувача з бекенду."
          );
        }
      } else {
        console.error(
          "AdminLayout: Немає токена для завантаження даних користувача."
        );
      }

      setIsLoadingUser(false);
    };

    loadUserData();
  }, []);

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUserData");
    window.location.href = frontendLoginUrl; // Перенаправлення на логін фронтенду
  };

  return (
    <>
      <ToastContainer />
      <Navbar
        userData={userData}
        isLoadingUser={isLoadingUser}
        onLogout={handleLogout}
      />
      <hr />
      <div className="flex pt-14 min-h-screen print:pt-0">
        <Sidebar />
        <main className="ml-[16%] flex-grow overflow-auto print:ml-0">
          <div>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="list-product" element={<ProductList />} />
              <Route path="orders" element={<Orders />} />
              <Route path="edit-product/:id" element={<EditProduct />} />
              <Route path="product/details/:id" element={<ProductDetails />} />
              <Route path="order/details/:id" element={<OrderDetails />} />
              <Route path="edit-order/:id" element={<EditOrder />} />
              <Route path="list-supplier" element={<SupplierList />} />
              <Route path="add-supplier" element={<AddSupplier />} />
              <Route path="edit-supplier/:id" element={<EditSupplier />} />
              <Route
                path="suppliers/details/:id"
                element={<SupplierDetails />}
              />
              <Route path="list-invoice" element={<InvoiceList />} />
              <Route path="add-invoice" element={<AddInvoice />} />
              <Route path="edit-invoice/:id" element={<EditInvoice />} />
              <Route path="invoices/details/:id" element={<InvoiceDetails />} />
              <Route path="list-employees" element={<EmployeesList />} />
              <Route path="add-employee" element={<AddEmployee />} />
              <Route path="edit-employee/:id" element={<EditEmployee />} />
              <Route path="user/details/:id" element={<EmployeeDetails />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin_panel" replace />} />

        <Route
          path="/admin_panel/*"
          element={
            <AuthWrapper>
              <AdminLayout />
            </AuthWrapper>
          }
        />

        <Route path="*" element={<Navigate to="/admin_panel" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

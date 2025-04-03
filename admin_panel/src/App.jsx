import { BrowserRouter, Routes, Route } from "react-router-dom"
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
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  // onst[user, setUser] = useState(null);

  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     const decoded = jwtDecode(token);
  //     axios.get(`/api/user/details/${decoded.id}`)
  //       .then(response => {
  //         if (response.data.success) {
  //           setUser(response.data.data);
  //         }
  //       })
  //       .catch(error => {
  //         console.error('Error fetching user data:', error);
  //       });
  //   }
  // }, []);
  return (
    <BrowserRouter>
      <ToastContainer />
      {/* <WelcomeMessage user={user} /> */}
      <Navbar />
      <hr />
      <div className="flex w-full pt-14 pl-7">
        <Sidebar />

        <Routes>
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/list-product" element={<ProductList />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/product/details/:id" element={<ProductDetails />} />
          <Route path="/order/details/:id" element={<OrderDetails />} />
          <Route path="/edit-order/:id" element={<EditOrder />} />
          <Route path="/list-supplier" element={<SupplierList />} />
          <Route path="/add-supplier" element={<AddSupplier />} />
          <Route path="/edit-supplier/:id" element={<EditSupplier />} />
          <Route path="/suppliers/details/:id" element={<SupplierDetails />} />
          <Route path="/list-invoice" element={<InvoiceList />} />
          <Route path="/add-invoice" element={<AddInvoice />} />
          <Route path="/edit-invoice/:id" element={<EditInvoice />} />
          <Route path="/invoices/details/:id" element={<InvoiceDetails />} />
          <Route path="/list-employees" element={<EmployeesList />} />
          <Route path="/add-employee" element={<AddEmployee />} />
          <Route path="/edit-employee/:id" element={<EditEmployee />} />
          <Route path="/user/details/:id" element={<EmployeeDetails />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
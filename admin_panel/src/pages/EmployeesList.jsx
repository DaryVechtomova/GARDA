import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { TbTrash, TbEdit } from "react-icons/tb";
import { NavLink } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import Flower from "../assets/design/flower.png";

function EmployeesList() {
  const url = "http://localhost:4000";
  const [employees, setEmployees] = useState([]);
  const [showFireConfirmation, setShowFireConfirmation] = useState(false);
  const [employeeToFire, setEmployeeToFire] = useState(null);
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  // Отримання списку співробітників
  const fetchEmployees = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      window.location.href = FRONTEND_LOGIN_URL;
      return;
    }
    try {
      const response = await axios.get(`${url}/api/user/list-employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        if (response.data.data.length === 0) {
          toast.info("Працівників ще немає");
          setEmployees([]);
        } else {
          setEmployees(response.data.data);
        }
      } else {
        toast.error("Помилка завантаження списку співробітників");
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Якщо сервер повернув 403 - доступ заборонено
        setAccessDenied(true);
      } else {
        toast.error("Не вдалося отримати дані");
      }
    }
  };

  // Звільнення співробітника
  const fireEmployee = async (employeeId) => {
    try {
      const response = await axios.post(`${url}/api/user/fire-employee`, {
        id: employeeId,
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchEmployees();
      } else {
        toast.error("Помилка при звільненні співробітника");
      }
    } catch (error) {
      toast.error("Не вдалося звільнити співробітника");
    } finally {
      setShowFireConfirmation(false);
    }
  };

  // Відкриття модального вікна для підтвердження звільнення
  const handleFireClick = (employeeId) => {
    setEmployeeToFire(employeeId);
    setShowFireConfirmation(true);
  };

  // Підтвердження звільнення
  const confirmFire = () => {
    if (employeeToFire) {
      fireEmployee(employeeToFire);
    }
  };

  // Скасування звільнення
  const cancelFire = () => {
    setEmployeeToFire(null);
    setShowFireConfirmation(false);
  };

  // Фільтрація співробітників за роллю та статусом
  const filterEmployees = (employees) => {
    let filteredEmployees = employees;

    if (filterRole !== "All") {
      filteredEmployees = filteredEmployees.filter(
        (employee) => employee.role === filterRole
      );
    }

    if (filterStatus !== "All") {
      filteredEmployees = filteredEmployees.filter((employee) =>
        filterStatus === "Активний" ? employee.isActive : !employee.isActive
      );
    }

    return filteredEmployees;
  };

  // Пошук співробітників за прізвищем
  const searchEmployees = (employees) => {
    if (!searchQuery) return employees;
    return employees.filter((employee) =>
      employee.secondName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Сортування: спочатку активні, потім звільнені
  const sortedAndFilteredEmployees = searchEmployees(
    filterEmployees(employees)
  ).sort((a, b) => {
    return b.isActive - a.isActive;
  });

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-2xl font-bold text-[#99120d] mb-4">
            Доступ заборонено
          </h2>
          <p className="text-gray-700 mb-6">
            Ви не маєте необхідних прав для перегляду цієї сторінки. Будь ласка,
            зверніться до адміністратора.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            На головну
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="p-10 w-full bg-primary/20">
      <div className="px-4">
        <div className="flex items-center mb-4">
          <img
            src={Flower}
            alt=""
            className="
                                            h-12 w-12
                                            sm:h-14 sm:w-14
                                            md:h-16 md:w-16
                                            object-contain
                                            mr-2 sm:mr-3 md:mr-4
                                            transform translate-y-[10px]  {/* АБО translate-y-2.5 якщо ви налаштували такі кроки */}
                                        "
          />
          <h2
            style={{ fontFamily: "Montserrat Alternates", fontWeight: 600 }}
            className="
                                            text-xl
                                            sm:text-2xl
                                            md:text-3xl
                                            text-center
                                            text-black
                                        "
          >
            Список співробітників
          </h2>
          <img
            src={Flower}
            alt=""
            className="
                                            h-12 w-12
                                            sm:h-14 sm:w-14
                                            md:h-16 md:w-16
                                            object-contain
                                            ml-2 sm:ml-3 md:ml-4
                                            transform translate-y-[10px] {/* АБО translate-y-2.5 */}
                                        "
          />
        </div>
        {/* <h4 className="bold-22 pb-2 uppercase">Список співробітників</h4> */}

        <div className="flex gap-4 mb-4 flex-wrap">
          <select
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
          >
            <option value="All">Всі ролі</option>
            <option value="адміністратор">Адміністратор</option>
            <option value="комірник">Комірник</option>
            <option value="менеджер з продажу">Менеджер з продажу</option>
          </select>
          <select
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
          >
            <option value="All">Всі статуси</option>
            <option value="Активний">Активний</option>
            <option value="Неактивний">Неактивний</option>
          </select>
          <input
            type="text"
            placeholder="Пошук за прізвищем"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb42c]"
          />
          {/* Кнопка для додавання нового співробітника */}
          <NavLink to="/admin_panel/add-employee">
            <button className="px-4 py-2 bg-[#fbb42c] text-black font-bold rounded-lg shadow-md hover:bg-[#d0882a] transition">
              Додати співробітника
            </button>
          </NavLink>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-238px)]">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-3 border">Ім'я</th>
                <th className="p-3 border">Прізвище</th>
                <th className="p-3 border">Пошта</th>
                <th className="p-3 border">Телефон</th>
                <th className="p-3 border">Роль</th>
                <th className="p-3 border">Статус</th>
                <th className="p-3 border w-20">Деталі</th>
                <th className="p-3 border w-20">Редагувати</th>
                <th className="p-3 border w-20">Звільнити</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredEmployees.map((employee) => (
                <tr key={employee._id}>
                  <td className="p-3 border">{employee.firstName}</td>
                  <td className="p-3 border">{employee.secondName}</td>
                  <td className="p-3 border">{employee.email}</td>
                  <td className="p-3 border">{employee.phoneNumber}</td>
                  <td className="p-3 border">{employee.role}</td>
                  <td className="p-3 border">
                    {employee.isActive ? "активний" : "звільнений"}
                  </td>
                  <td className="p-3 border text-center">
                    <NavLink
                      to={`/admin_panel/user/details/${employee._id}`}
                      className="text-blue-500 hover:text-blue-700 flex justify-center"
                    >
                      <FaPlus size={20} />
                    </NavLink>
                  </td>
                  <td className="p-3 border justify-center items-center">
                    <NavLink
                      to={`/admin_panel/edit-employee/${employee._id}`}
                      className="text-blue-500 hover:text-blue-700 flex justify-center"
                    >
                      <TbEdit size={20} />
                    </NavLink>
                  </td>
                  <td className="p-3 border text-center">
                    {employee.isActive ? ( // Умовний рендеринг кнопки "Звільнити"
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleFireClick(employee._id)}
                          className="text-[#99120d] hover:text-[#7a0e0a] flex justify-center"
                          size={20}
                        >
                          Звільнити
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Звільнений</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальне вікно підтвердження звільнення */}
      {showFireConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Підтвердження звільнення</h2>
            <p>Ви впевнені, що хочете звільнити цього співробітника?</p>
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={cancelFire}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Скасувати
              </button>
              <button
                onClick={confirmFire}
                className="px-4 py-2 bg-[#99120d] text-white rounded-lg hover:bg-[#7a0e0a]"
              >
                Звільнити
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default EmployeesList;

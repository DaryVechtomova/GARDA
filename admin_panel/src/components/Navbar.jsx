import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom"; // Для посилань у меню
import { CgProfile } from "react-icons/cg"; // Іконка профілю
import { FaUserEdit, FaKey, FaSignOutAlt, FaSpinner } from "react-icons/fa"; // Іконки для меню

// Хук для визначення кліку поза елементом
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      // Не робити нічого, якщо клік всередині ref або на нащадках ref
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

const Navbar = ({ userData, isLoadingUser, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref для контейнера дропдауну

  // Закриваємо дропдаун при кліку поза ним
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Закриваємо дропдаун при кліку на пункт меню (крім Вийти)
  const handleLinkClick = () => {
    setIsDropdownOpen(false);
  };

  // Обробник виходу
  const handleLogoutClick = () => {
    setIsDropdownOpen(false); // Закриваємо дропдаун
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUserData");
    onLogout(); // Викликаємо функцію виходу
  };

  return (
    <div className="print-hide fixed w-full top-0 left-0 right-0 py-4 transition-all bg-[#fcfaf4] z-50 border-b border-b-slate-900/10">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4">
        <h1
          className="text-[30px] font-bold text-center w-full"
          style={{ fontFamily: "'Labrada', serif" }}
        >
          GARDA
        </h1>

        {/* Контейнер для іконки профілю та дропдауна */}
        <div className="relative" ref={dropdownRef}>
          {/* Кнопка з іконкою */}
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            aria-label="Меню користувача"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            {isLoadingUser ? (
              <FaSpinner className="animate-spin text-xl text-gray-500" />
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <CgProfile size={28} className="text-black" />
                  {userData && (
                    <span className="hidden md:inline text-sm font-medium text-gray-700">
                      {userData.firstName || userData.email}
                    </span>
                  )}
                </div>
              </>
            )}
          </button>

          {/* Випадаюче меню */}
          {isDropdownOpen && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-56 origin-top bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
            >
              {/* Пункти меню */}
              <NavLink
                to="/admin_panel/profile" // Посилання на сторінку профілю
                onClick={handleLinkClick} // Закриваємо меню при кліку
                className={(
                  { isActive } // Стилізація активного посилання
                ) =>
                  `flex items-center gap-3 px-4 py-2 text-sm ${
                    isActive ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  } hover:bg-gray-100 w-full text-left`
                }
                role="menuitem"
              >
                <FaUserEdit className="text-gray-500" />
                Профіль
              </NavLink>
              <NavLink
                to="/admin_panel/change-password" // Посилання на сторінку зміни пароля
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm ${
                    isActive ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  } hover:bg-gray-100 w-full text-left`
                }
                role="menuitem"
              >
                <FaKey className="text-gray-500" />
                Змінити пароль
              </NavLink>
              <button
                onClick={handleLogoutClick} // Викликаємо обробник виходу
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#99120d] hover:bg-red-50 w-full text-left"
                role="menuitem"
              >
                <FaSignOutAlt />
                Вийти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;

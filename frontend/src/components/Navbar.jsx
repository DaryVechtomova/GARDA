// src/components/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ containerStyles, closeMenu }) => {
    const location = useLocation();

    const handleLinkClick = () => {
        if (closeMenu) {
            closeMenu();
        }
    };

    return (
        <nav
         style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}
            // Застосовуємо передані класи Tailwind
            className={`${containerStyles}`}
            // Застосовуємо інлайн-стилі для шрифту
           
        >
            <Link
                to="/"
                onClick={handleLinkClick}
                className={`hover:text-secondary ${location.pathname === '/' ? 'text-secondary font-semibold' : ''}`}
            >
                Головна сторінка
            </Link>
            {/* ... інші посилання ... */}
             <Link
                to="/catalog/women"
                onClick={handleLinkClick}
                className={`hover:text-secondary ${location.pathname === '/catalog/women' ? 'text-secondary font-semibold' : ''}`}
            >
                Для жінок
            </Link>
            <Link
                to="/catalog/accessories"
                onClick={handleLinkClick}
                className={`hover:text-secondary ${location.pathname === '/catalog/accessories' ? 'text-secondary font-semibold' : ''}`}
            >
                Аксесуари
            </Link>
            <Link
                to="/catalog/men"
                onClick={handleLinkClick}
                className={`hover:text-secondary ${location.pathname === '/catalog/men' ? 'text-secondary font-semibold' : ''}`}
            >
                Для чоловіків
            </Link>
            <Link
                to="/catalog/all"
                onClick={handleLinkClick}
                className={`hover:text-secondary ${location.pathname === '/catalog/all' ? 'text-secondary font-semibold' : ''}`}
            >
                Усі товари
            </Link>
        </nav>
    );
};

export default Navbar;
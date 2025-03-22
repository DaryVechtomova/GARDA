import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";

const Item = ({ product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);

    const handleNextImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
    };

    const handlePreviousImage = () => {
        setCurrentImageIndex((prevIndex) =>
            prevIndex === 0 ? product.images.length - 1 : prevIndex - 1
        );
    };

    const toggleFavorite = () => {
        setIsFavorited(!isFavorited);
    };

    return (
        <div
            className="item-container bg-[#FCFAF4] shadow-md rounded-[15px] p-4 flex flex-col justify-between relative"
            style={{ width: '370px', height: '571px' }}
        >
            {/* Зображення з навігацією */}
            <div className="relative">
                <button
                    onClick={handlePreviousImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2"
                >
                    ◀
                </button>
                <Link to={`/product/${product._id}`}>
                    <img
                        src={product.images[currentImageIndex]}
                        alt={product.name}
                        style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                        }}
                        className="border border-gray-500"
                    />
                </Link>
                <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                    ▶
                </button>
            </div>

            {/* Назва і ціна */}
            <div className="text-center mt-4">
                <h4 className="font-semi-bold text-l mb-5">{product.name}</h4>
                <span className="text-lg text-gray-800">Ціна: {product.price} грн</span>
            </div>

            {/* Іконка сердечка */}
            <button
                onClick={toggleFavorite}
                className="absolute bottom-4 right-4"
                style={{
                    fontSize: '2.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                }}
            >
                <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill={isFavorited ? "#991313" : "transparent"} // Заливка змінюється
                    stroke="black" // Чорний контур завжди
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>
                </svg>
            </button>

        </div>
    );
};

export default Item;

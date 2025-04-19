import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaMinus, FaPlus } from 'react-icons/fa6';
import { ShopContext } from '../context/ShopContext';


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

    const { cartItems, addToCart, removeFromCart, url } = useContext(ShopContext);


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
                        src={url+"/images/"+product.images[currentImageIndex]}
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
            <Link to={`/product/${product._id}`}>
            {/* Назва і ціна */}
            <div className="text-center mt-4">
                <h4 style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }} className="font-semi-bold text-l mb-2">{product.name}</h4>
                <div className="text-lg text-gray-800">
                <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Ціна:</span>
                {product.price ? (
                    <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }} className="ml-2">
                    {product.discount ? (
                        <>
                        <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}className="line-through text-gray-500">{product.price} грн</span>
                        <br />
                        <span style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }} className="text-red-600 font-bold">
                            {Math.round(product.price * (1 - product.discount / 100))} грн
                        </span>
                        </>
                    ) : (
                        <>{product.price} грн</>
                    )}
                    </span>
                ) : (
                    'Ціна не вказана'
                )}
                </div>




            </div>
            </Link>
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

            <div className="absolute bottom-4 left-4">
                {!cartItems[product._id] ? (
                    <FaPlus onClick={() => addToCart(product._id)}

                        className='bg-white h-8 w-8 p-2 rounded-full shadow-inner cursor-pointer' />
                ) : (
                    <div className='bg-white rounded-full flexCenter gap-2 h-8'>
                        <FaMinus onClick={() => removeFromCart(product._id)}

                            className='bg-primary h-6 w-6 p-1 ml-1 cursor-pointer rounded-full' />
                        <p>{cartItems[product._id]}</p>
                        <FaPlus onClick={() => addToCart(product._id)}

                            className='bg-primary h-6 w-6 p-1 mr-1 cursor-pointer rounded-full' />
                    </div>
                )}
            </div>


        </div>
    );
};

export default Item;

import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext'; // Переконайтеся, що шлях правильний
import { TbTrash, TbHeart, TbPlus, TbMinus } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';
import FlowerRight from '../assets/design/flowers-right.png'; // Переконайтесь, що шлях правильний

const Cart = () => {
    // Отримуємо все необхідне з контексту, включно з даними для wishlist
    const {
        all_products,
        cartItems,
        wishlistItems,     // Стан обраного
        url,
        removeFromCart,    // Функція видалення/зменшення з кошика
        getTotalCartAmount,
        addToCart,         // Функція додавання/збільшення в кошик
        toggleWishlist,    // Функція перемикання стану обраного
        token              // Токен для перевірки авторизації
    } = useContext(ShopContext);
    const navigate = useNavigate();

  

    // Перевірка завантаження основних даних з контексту
    // Це важливо, щоб уникнути помилок під час першого рендерингу, поки дані ще не завантажилися
    if (!all_products || !cartItems || !url || !wishlistItems || !toggleWishlist) {
        return (
            <div className='min-h-screen pt-28 pb-16 flex justify-center items-center'>
                {/* Тут можна розмістити спіннер або просто текст */}
                <div>Завантаження даних кошика...</div>
            </div>
        );
    }

    // Обробник зміни кількості товару
    const handleQuantityChange = (itemId, change, event) => {
        event.stopPropagation(); // Запобігаємо спрацьовуванню кліків на батьківських елементах
        const currentQuantity = cartItems[itemId] || 0;

        if (change > 0) {
            addToCart(itemId); // Викликаємо функцію додавання/збільшення з контексту
        } else if (change < 0 && currentQuantity > 0) {
            // Викликаємо функцію видалення/зменшення з контексту
            // Контекст сам вирішує, зменшити на 1 чи видалити повністю, якщо був 1
            removeFromCart(itemId);
        }
        // Якщо change < 0 і currentQuantity === 0, нічого не робимо
    };

    // Обробник кліку на сердечко (додати/видалити з обраного)
    const handleToggleFavoriteItem = (productId, event) => {
        event.stopPropagation();
        console.log(token);
        if (!token) {
            alert("Будь ласка, увійдіть до акаунту, щоб додавати товари до обраного.");
            return;
        }
        toggleWishlist(productId);
    };

    // Отримуємо загальну суму для перевірки, чи кошик порожній
    const totalAmount = getTotalCartAmount();

    return (
        // Звичайний фон, без bg-gray-50
        <section className='min-h-screen pt-28 pb-16 font-["Literata"]'>
            <div className='max-w-[1440px] mx-auto px-4 md:px-8 xl:px-20'>
                <h2
                    style={{ fontFamily: 'Montserrat Alternates' }}
                    className='text-center text-2xl md:text-3xl font-semibold mb-8 md:mb-12'
                >
                    Ваш Кошик
                </h2>

                {totalAmount > 0 ? (
                    <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
                        {/* Ліва колонка: Список товарів */}
                        <div className="flex-grow xl:w-2/3 space-y-6">
                            {all_products.map((product) => {
                                const quantity = cartItems[product._id];
                                // Визначаємо, чи є товар в обраному, перевіряючи наявність ключа та значення > 0
                                const isCurrentItemFavorited = wishlistItems && wishlistItems[product._id] && wishlistItems[product._id] > 0;

                                // Відображаємо товар, тільки якщо його кількість в кошику більше 0
                                if (quantity && quantity > 0) {
                                    const finalPrice = product.discount
                                        ? Math.round(product.price * (1 - product.discount / 100))
                                        : product.price;

                                    return (
                                        <div
                                            key={product._id}
                                            className="bg-[#FCFAF4] shadow-md rounded-[30px] p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6 relative overflow-hidden"
                                        >
                                            {/* Контейнер для зображення з relative для позиціонування серця */}
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={product.images && product.images.length > 0 ? `${url}/images/${product.images[0]}` : 'placeholder.jpg'}
                                                    alt={product.name}
                                                    className="w-24 h-32 sm:w-36 sm:h-48 md:w-40 md:h-52 xl:w-[173px] xl:h-[230px] object-cover rounded-lg border border-black/20"
                                                />
                                                {/* Кнопка "Обране" */}
                                                {/* Іконка сердечка */}
                                                <button
                                                onClick={(e) => handleToggleFavoriteItem(product._id, e)}
                                                // Змінюємо позиціонування на top-4 right-4
                                                // Можна використовувати sm:top-6 sm:right-6 md:top-8 md:right-8 для адаптивних відступів,
                                                // які відповідають вашим p-4 sm:p-6 md:p-8 на батьківському елементі.
                                                // Або просто менші фіксовані значення, наприклад top-3 right-3 або top-2 right-2.
                                                className="absolute top-3 right-3 p-1 z-10" // z-10 щоб було поверх інших елементів, якщо потрібно
                                                style={{
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}
                                                aria-label={isCurrentItemFavorited ? "Видалити з обраного" : "Додати в обране"}
                                            >
                                                <svg
                                                    width="28" // Можна трохи зменшити розмір для верхнього кута
                                                    height="28"
                                                    viewBox="0 0 24 24"
                                                    fill={isCurrentItemFavorited ? "#991313" : "transparent"}
                                                    stroke="black"
                                                    strokeWidth="1.25"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"></path>
                                                </svg>
                                            </button>
                                            </div>

                                            {/* Блок з інформацією про товар */}
                                            <div className="flex-1 flex flex-col justify-between">
                                                {/* Верхня частина: Назва, ціна (моб), деталі */}
                                                <div>
                                                    <h4
                                                        style={{ fontFamily: 'Montserrat Alternates' }}
                                                        className="font-semibold text-sm sm:text-base md:text-lg xl:text-xl leading-tight mb-1"
                                                    >
                                                        {product.name}
                                                    </h4>
                                                    {/* Ціна для мобільних */}
                                                    <div className="sm:hidden text-sm font-semibold my-1">
                                                        Ціна: {finalPrice} грн
                                                    </div>
                                                    {/* Плейсхолдери для розміру/кольору */}
                                                    <div className="text-xs sm:text-sm text-gray-600 space-y-1 mt-2 sm:mt-1">
                                                        <p><span className="font-medium">Розмір:</span> M {/* Замініть на реальні дані */}</p>
                                                        <p><span className="font-medium">Колір:</span> білий {/* Замініть на реальні дані */}</p>
                                                    </div>
                                                </div>

                                                {/* Нижня частина: Контроль кількості, ціна (десктоп) */}
                                                <div className="flex items-end justify-between mt-3 sm:mt-4">
                                                    <div className="flex items-center gap-2">
                                                        {/* Кнопка "-" */}
                                                        <button
                                                            onClick={(e) => handleQuantityChange(product._id, -1, e)}
                                                            className={`w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-full border-2 bg-white/70 transition-colors ${quantity > 0 ? 'border-[#54A5D9] hover:bg-[#54A5D9]/20' : 'border-gray-300 cursor-not-allowed'}`} // Змінюємо стиль, якщо кількість 0
                                                            disabled={quantity <= 0}
                                                            aria-label="Зменшити кількість"
                                                        >
                                                            <TbMinus className={`w-3 h-3 md:w-4 md:h-4 ${quantity > 0 ? 'text-black' : 'text-gray-400'}`} />
                                                        </button>
                                                        {/* Кількість */}
                                                        <span className='w-5 text-center font-["Inter"] font-medium text-base md:text-lg'>{quantity}</span>
                                                        {/* Кнопка "+" */}
                                                        <button
                                                            onClick={(e) => handleQuantityChange(product._id, 1, e)}
                                                            className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-full border-2 border-[#54A5D9] bg-white/70 hover:bg-[#54A5D9]/20 transition-colors"
                                                            aria-label="Збільшити кількість"
                                                        >
                                                            <TbPlus className="w-3 h-3 md:w-4 md:h-4" />
                                                        </button>
                                                    </div>
                                                    {/* Ціна для десктопних екранів */}
                                                    <div className="hidden sm:block text-right">
                                                        <p className="font-semibold text-sm md:text-base xl:text-lg">
                                                            Ціна: {finalPrice} грн
                                                        </p>
                                                    </div>
                                                 
                                                </div>
                                            </div>
                                           
                                        </div>
                                    );
                                }
                                return null; // Не рендеримо товар, якщо його немає в кошику
                            })}
                        </div>

                        <div className="relative w-full max-w-[570px] mx-auto">
 

  {/* Контейнер з підсумком */}
  <div className="relative z-10 bg-[#FCFAF4] shadow-md rounded-[30px] p-6 md:p-8 sticky top-24">
  

     {/* Фонова квітка */}
  <img
    src={FlowerRight}
    alt=""
    className="absolute z-0 left-[68%] top-[1%] w-[30%] max-w-[258px] h-auto opacity-100 pointer-events-none"
  />
    <h4
      style={{ fontFamily: 'Montserrat Alternates' }}
      className="font-semibold text-xl md:text-2xl mb-6"
    >
      Підсумок замовлення
    </h4>

    {/* Суми */}
    <div className="space-y-3 text-sm md:text-base font-medium text-gray-700">
      <div className="flex">
        <span className="text-gray-600">Сума товарів: {totalAmount} грн</span>
        
      </div>
      <div className="flex">
        <span className="text-gray-600">Вартість доставки: {totalAmount === 0 ? 0 : 2} грн</span>
      </div>
    </div>

    <hr className="my-4 border-gray-300/70" />

    <div className="flex justify-between items-center">
      <h5
        style={{ fontFamily: 'Montserrat Alternates' }}
        className="font-semibold text-base md:text-lg"
      >
        Загальна сума:
      </h5>
      <span
        style={{ fontFamily: 'Montserrat Alternates' }}
        className="font-semibold text-base md:text-lg"
      >
        {totalAmount === 0 ? 0 : totalAmount + 2} грн
      </span>
    </div>

    {/* Кнопка */}
    <button
      onClick={() => navigate("/order")}
      className="w-full bg-[#54A5D9] hover:bg-[#4389b9] text-white font-medium text-base md:text-lg rounded-lg py-3 mt-6 transition-colors duration-200"
    >
      Оформлення замовлення
    </button>
  </div>
</div>


                    </div>
                ) : (
                    // Повідомлення про порожній кошик
                    <div className='text-center py-20'>
                        <p className='text-xl text-gray-600 mb-6'>Ваш кошик порожній.</p>
                        {/* Стилізував кнопку під стиль кнопки "Оформлення замовлення" */}
                        <button
                            onClick={() => navigate('/')}
                            className='bg-[#54A5D9] hover:bg-[#4389b9] text-white py-2 px-6 rounded-md transition-colors duration-200'
                        >
                            Продовжити покупки
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Cart;
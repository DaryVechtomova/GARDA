import React, { useState, useEffect } from "react";
import birds from "/src/assets/design/birds.png";
import inst from "/src/assets/design/inst.png";
import facebook from "/src/assets/design/facebook.png";
import youtube from "/src/assets/design/youtube.png";
import linkedin from "/src/assets/design/linkedin.png";

const Footer = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [showBirds, setShowBirds] = useState(window.innerWidth > 1425);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            setShowBirds(window.innerWidth > 1425);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <footer id='contact' className="relative w-full bg-[#E0DED8] overflow-hidden">
            {/* Десктопна версія (lg і більше) */}
            {!isMobile && (
                <div className="relative w-full h-[180px] flex justify-center items-center">
                    {/* Логотип птахів */}
                    {showBirds && (
                        <img src={birds} alt="birds" className="absolute right-10 w-[252px] h-[129px]" />
                    )}

                    {/* Меню */}
                    <nav className="absolute left-[100px] top-1/2 transform -translate-y-1/2">
                        <ul className="text-black text-[18px] leading-[26px] font-[400] space-y-1">
                            <li>Контакти</li>
                            <li>Доставка та оплата</li>
                            <li>Обмін та повернення</li>
                            <li>Про нас</li>
                        </ul>
                    </nav>

                    {/* Адреси магазинів */}
                    <div className="absolute left-[900px] top-1/2 transform -translate-y-1/2 text-black text-[22px] leading-[30px] font-[600] w-[350px]">
                        <p>Офіційні магазини:</p>
                        <p>м. Київ, проспект Перемоги, 24 (01135)</p>
                        <p>м. Львів, вул. Галицька, 10 (79008)</p>
                        <p>м. Харків, вул. Сумська, 45 (61057)</p>
                    </div>

                    {/* Соціальні мережі */}
                    <div className="absolute left-[400px] flex space-x-4">
                        <img src={inst} alt="Instagram" className="w-[80px] h-[80px]" />
                        <img src={facebook} alt="Facebook" className="w-[80px] h-[80px]" />
                        <img src={youtube} alt="YouTube" className="w-[80px] h-[80px]" />
                        <img src={linkedin} alt="LinkedIn" className="w-[80px] h-[80px]" />
                    </div>
                </div>
            )}

            {/* Мобільна версія (менше lg) */}
            {isMobile && (
                <div className="w-full py-8 px-4">
                    <div className="max-w-md mx-auto">
                        {/* Соціальні мережі (центруємо) */}
                        <div className="flex justify-center space-x-4 mb-6">
                            <img src={inst} alt="Instagram" className="w-12 h-12" />
                            <img src={facebook} alt="Facebook" className="w-12 h-12" />
                            <img src={youtube} alt="YouTube" className="w-12 h-12" />
                            <img src={linkedin} alt="LinkedIn" className="w-12 h-12" />
                        </div>

                        {/* Меню (центруємо) */}
                        <nav className="mb-6">
                            <ul className="text-center space-y-2">
                                <li className="text-black text-[16px] leading-[24px] font-[400]">Контакти</li>
                                <li className="text-black text-[16px] leading-[24px] font-[400]">Доставка та оплата</li>
                                <li className="text-black text-[16px] leading-[24px] font-[400]">Обмін та повернення</li>
                                <li className="text-black text-[16px] leading-[24px] font-[400]">Про нас</li>
                            </ul>
                        </nav>

                        {/* Адреси магазинів (центруємо) */}
                        <div className="text-center">
                            <p className="text-black text-[18px] leading-[26px] font-[600] mb-2">Офіційні магазини:</p>
                            <p className="text-black text-[14px] leading-[20px] font-[400]">м. Київ, проспект Перемоги, 24 (01135)</p>
                            <p className="text-black text-[14px] leading-[20px] font-[400]">м. Львів, вул. Галицька, 10 (79008)</p>
                            <p className="text-black text-[14px] leading-[20px] font-[400]">м. Харків, вул. Сумська, 45 (61057)</p>
                        </div>
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;
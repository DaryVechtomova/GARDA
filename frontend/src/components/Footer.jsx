import React from "react";
import birds from "/src/assets/design/birds.png";
import inst from "/src/assets/design/inst.png";
import facebook from "/src/assets/design/facebook.png";
import youtube from "/src/assets/design/youtube.png";
import linkedin from "/src/assets/design/linkedin.png";

const Footer = () => {
    return (
        <footer id='contact' className="relative w-full h-[180px] bg-[#E0DED8] flex justify-center items-center">
            {/* Логотип птахів */}
            <img src={birds} alt="birds" className="absolute right-10 w-[252px] h-[129px]" />

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
        </footer>
    );
};

export default Footer;

import React from "react";
import profile from "../assets/profile.png";

const Navbar = () => {
    return (
        <div className="max-padd-container bg-[#FCFAF4] py-2">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4">
                <h1 className="text-[30px] font-bold text-center w-full" style={{ fontFamily: "'Labrada', serif" }}>
                    GARDA
                </h1>
                <img src={profile} alt="profileImg" height={46} width={46} className="rounded-full" />
            </div>
        </div>
    );
};
// max-padd-container flexBetween py-2
export default Navbar;
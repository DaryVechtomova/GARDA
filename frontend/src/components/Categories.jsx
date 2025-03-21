import React from 'react';
import { categories } from '../assets/data';
import '../assets/fonts/fonts.css';

const Categories = () => {
    return (
        <section id="categories" className="max-padd-container pt-40">
            {/* Title */}
            <div className="flexBetween pb-20">
                <h4 className="text-4xl font-extrabold leading-none font-ace flex flex-col">

                    <span style={{ fontFamily: 'NyghtSerif', fontWeight: 1000 }}>
                        Категорії
                    </span>
                </h4>
            </div>

            {/* Container */}
            <div className="flexStart gap-12 flex-wrap">
                {categories.map((item) => (
                    <div id={item.name} key={item.name} className="flexCenter flex-col">
                        <div>
                            <img
                                src={item.image}
                                alt="categoryImg"
                                height={300}
                                width={300}
                            />
                        </div>
                        <h4>{item.name}</h4>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Categories;
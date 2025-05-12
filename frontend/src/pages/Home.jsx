import React, { useState } from 'react';
import Hero from "../components/Hero"
import Categories from "../components/Categories"
import ProductDisplay from '../components/ProductDisplay';
import DiscountedProductsPage from '../pages/DiscountedProductsPage';
import ProductHd from '../components/ProductHd';

const Home = () => {

    const [category, setCategory] = useState('All');

    return (
        <>
            <Hero />
            <Categories category={category} setCategory={setCategory} />
            <DiscountedProductsPage category={category} />
        </>
    );
};

export default Home;





import React, { useState } from 'react';
import Hero from "../components/Hero"
import Categories from "../components/Categories"
import ProductDisplay from '../components/ProductDisplay';

const Home = () => {

    const [category, setCategory] = useState('All');

    return (
        <>
            <Hero />
            <Categories category={category} setCategory={setCategory} />
            <ProductDisplay category={category} />
        </>
    );
};

export default Home;





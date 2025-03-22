import React from 'react';
import Hero from "../components/Hero"
import Categories from "../components/Categories"
import ProductDisplay from '../components/ProductDisplay';

const Home = () => {
    return (
        <>
            <Hero />
            <Categories />
            <ProductDisplay />
        </>
    );
};

export default Home;
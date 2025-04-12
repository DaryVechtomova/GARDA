import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useParams } from 'react-router-dom';
import ProductMd from '../components/ProductMd';
import ProductHd from '../components/ProductHd';

const Product = () => {
  const { all_products } = useContext(ShopContext);
  const { productId } = useParams();
  
  const product = all_products.find((e) => e._id === productId);
  
  if (!product) {
    return <div className='not-found'>Product not Found</div>;
  }

  return (
    <section className='product-page max-padd-container py-20 relative'> {/* Додано relative для позиціонування квітів */}
      <ProductHd  />
      <ProductMd product={product} />
    </section>
  );
};

export default Product;
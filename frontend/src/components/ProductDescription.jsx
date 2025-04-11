import React from 'react';

const ProductDescription = ({ product }) => {
  return (
    <div className='product-description-container'>
      <div className='description-tabs'>
        <button className='active'>Description</button>
        <button>Care Guide</button>
        <button>Size Guide</button>
      </div>
      <div className='description-content'>
        <p>{product.description}</p>
        <p>Additional product details would go here...</p>
      </div>
    </div>
  );
};

export default ProductDescription;


import React from "react";

const ProductDescription = ({ product }) => {
  if (!product) {
    return <div>Опис товару недоступний.</div>;
  }

  return (
    <div className="product-description-container">
      {/* 1. Основний Опис (завжди показуємо, бо required: true) */}
      {product.description && (
        <div className="description-content">
          <p>{product.description}</p>
        </div>
      )}

      {/* 2. Блок Додаткових Деталей */}
      {(product.fabric ||
        product.technique ||
        product.threads ||
        product.cut ||
        product.colors) && (
        <div
          className="product-details-list"
          style={{
            marginTop: "1rem",
            borderTop: "1px solid #eee",
            paddingTop: "0.5rem",
          }}
        >
          {product.colors && (
            <p className="detail-item" style={{ marginBottom: "0.3rem" }}>
              <strong>Кольори:</strong> {product.colors}
            </p>
          )}

          {/* --- Необов'язкові поля (показуємо тільки якщо вони існують в об'єкті product) --- */}
          {product.fabric && (
            <p className="detail-item" style={{ marginBottom: "0.3rem" }}>
              <strong>Тканина:</strong> {product.fabric}
            </p>
          )}

          {product.technique && (
            <p className="detail-item" style={{ marginBottom: "0.3rem" }}>
              <strong>Техніка виконання:</strong> {product.technique}
            </p>
          )}

          {product.threads && (
            <p className="detail-item" style={{ marginBottom: "0.3rem" }}>
              <strong>Нитки:</strong> {product.threads}
            </p>
          )}

          {product.cut && (
            <p className="detail-item" style={{ marginBottom: "0.3rem" }}>
              <strong>Крій:</strong> {product.cut}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDescription;

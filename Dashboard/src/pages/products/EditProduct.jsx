import React from "react";
import { Link, useParams } from "react-router-dom";
import AddProduct, { buildProductFormDataFromStorefrontProduct } from "./AddProduct";
import { allProducts } from "../../../../Frontend/data/storefront-content";

export default function EditProduct() {
  const { productId } = useParams();

  const product = React.useMemo(
    () => allProducts.find((entry) => entry.slug === productId),
    [productId]
  );

  const initialProductData = React.useMemo(
    () => (product ? buildProductFormDataFromStorefrontProduct(product) : null),
    [product]
  );

  if (!product || !initialProductData) {
    return (
      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit Product</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            We could not find a product matching this dashboard route.
          </p>
        </div>
        <div
          style={{
            padding: "20px",
            borderRadius: "12px",
            background: "#fff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            display: "grid",
            gap: "12px"
          }}
        >
          <p style={{ margin: 0, color: "#475569" }}>
            Return to the products table and choose another item to edit.
          </p>
          <div>
            <Link
              to="/dashboard/products"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                padding: "0 16px",
                borderRadius: "8px",
                background: "#16a34a",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 700
              }}
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AddProduct initialProductData={initialProductData} mode="edit" />;
}

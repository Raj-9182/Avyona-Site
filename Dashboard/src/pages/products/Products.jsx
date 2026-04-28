import React from "react";
import { Link } from "react-router-dom";
import products from "../../data/products";
import { fetchProducts } from "../../api/adminApi";
import { buildStorefrontProductUrl, formatCurrency } from "../../utils/storefront";

const rowsPerPageOptions = [5, 10, 20];

function getStatusBadgeStyle(status) {
  if (status === "active") {
    return {
      background: "#ecfdf3",
      color: "#166534"
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e"
  };
}

function getStockBadgeStyle(stockStatus) {
  if (stockStatus === "in-stock") {
    return {
      background: "#ecfdf3",
      color: "#166534"
    };
  }

  if (stockStatus === "low-stock") {
    return {
      background: "#fff7ed",
      color: "#c2410c"
    };
  }

  return {
    background: "#fef2f2",
    color: "#b91c1c"
  };
}

function normalizeProductRow(product) {
  const stock = Number(product.stockQuantity ?? product.stock ?? 0);
  let stockStatus = "in-stock";
  if (stock <= 0 || product.status === "out_of_stock") stockStatus = "out-of-stock";
  else if (stock <= 5) stockStatus = "low-stock";

  return {
    id: product.id,
    slug: product.slug,
    image: product.imageUrl || product.image || "/images/optimized/frame-1.webp",
    name: product.name,
    brand: product.brand,
    category: product.categoryName || product.category,
    sku: product.asin || product.sku || product.slug,
    price: Number(product.price || 0),
    stock,
    stockStatus,
    status: product.status === "active" ? "active" : "inactive",
    featured: Boolean(product.featured)
  };
}

export default function Products() {
  const [tableProducts, setTableProducts] = React.useState(products);
  const [sourceMessage, setSourceMessage] = React.useState("Showing local catalog preview.");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [brandFilter, setBrandFilter] = React.useState("all");
  const [stockFilter, setStockFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const categories = React.useMemo(
    () => ["all", ...new Set(tableProducts.map((product) => product.category).filter(Boolean))],
    [tableProducts]
  );
  const brands = React.useMemo(
    () => ["all", ...new Set(tableProducts.map((product) => product.brand).filter(Boolean))],
    [tableProducts]
  );

  const filteredProducts = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return tableProducts.filter((product) => {
      const matchesSearch = !query || [
        product.name,
        product.brand,
        product.category,
        product.sku,
        product.slug
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
      const matchesStock = stockFilter === "all" || product.stockStatus === stockFilter;
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;

      return matchesSearch && matchesCategory && matchesBrand && matchesStock && matchesStatus;
    });
  }, [brandFilter, categoryFilter, searchTerm, statusFilter, stockFilter, tableProducts]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, brandFilter, stockFilter, statusFilter, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedProducts = filteredProducts.slice(pageStart, pageStart + rowsPerPage);
  const pageEnd = Math.min(pageStart + rowsPerPage, filteredProducts.length);

  const handleDelete = (productId) => {
    setTableProducts((current) => current.filter((product) => product.id !== productId));
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await fetchProducts();
        if (!isMounted) return;

        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        if (rows.length) {
          setTableProducts(rows.map(normalizeProductRow));
          setSourceMessage("Products loaded from backend.");
          return;
        }

        setSourceMessage("Backend returned no products, so local catalog preview is shown.");
      } catch {
        if (!isMounted) return;
        setTableProducts(products);
        setSourceMessage("Backend products are unavailable, so local catalog preview is shown.");
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setBrandFilter("all");
    setStockFilter("all");
    setStatusFilter("all");
    setRowsPerPage(10);
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Products</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Search, filter, review, and manage your catalog from one table.
          </p>
          <p style={{ margin: "6px 0 0", color: "#0f766e", fontSize: "13px", fontWeight: 700 }}>
            {sourceMessage}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button type="button" onClick={resetFilters} style={secondaryToolbarButtonStyle}>
            Reset Filters
          </button>
          <Link to="/dashboard/products/new" style={primaryToolbarLinkStyle}>
            Add Product
          </Link>
        </div>
      </div>

      <section style={toolbarCardStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1.6fr) repeat(5, minmax(160px, 1fr))",
            gap: "16px"
          }}
        >
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, slug, brand, category, or SKU"
            style={filterInputStyle}
          />

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={filterInputStyle}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>

          <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} style={filterInputStyle}>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand === "all" ? "All Brands" : brand}
              </option>
            ))}
          </select>

          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} style={filterInputStyle}>
            <option value="all">All Stock</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={filterInputStyle}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))} style={filterInputStyle}>
            {rowsPerPageOptions.map((count) => (
              <option key={count} value={count}>
                {`${count} / page`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={summaryPillStyle}>{`Total: ${tableProducts.length}`}</span>
            <span style={summaryPillStyle}>{`Filtered: ${filteredProducts.length}`}</span>
            <span style={summaryPillStyle}>{`Showing: ${filteredProducts.length ? `${pageStart + 1}-${pageEnd}` : "0"}`}</span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Use the action buttons on each row to view, edit, or delete a product entry.
          </p>
        </div>
      </section>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          overflowX: "auto"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1380px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={tableHeaderStyle}>Product</th>
              <th style={tableHeaderStyle}>Brand</th>
              <th style={tableHeaderStyle}>Category</th>
              <th style={tableHeaderStyle}>SKU</th>
              <th style={tableHeaderStyle}>Price</th>
              <th style={tableHeaderStyle}>Stock</th>
              <th style={tableHeaderStyle}>Stock Badge</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Featured</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => (
              <tr key={product.id}>
                <td style={tableCellStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: "12px", alignItems: "center" }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: "56px",
                        height: "56px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        background: "#f8fafc"
                      }}
                    />
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong>{product.name}</strong>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>{product.slug}</span>
                    </div>
                  </div>
                </td>
                <td style={tableCellStyle}>{product.brand}</td>
                <td style={tableCellStyle}>{product.category}</td>
                <td style={tableCellStyle}>{product.sku}</td>
                <td style={tableCellStyle}>{formatCurrency(product.price)}</td>
                <td style={tableCellStyle}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <strong>{product.stock}</strong>
                    <span style={{ color: "#64748b", fontSize: "12px", textTransform: "capitalize" }}>
                      {product.stockStatus.replace(/-/g, " ")}
                    </span>
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      ...pillBaseStyle,
                      ...getStockBadgeStyle(product.stockStatus),
                      textTransform: "capitalize"
                    }}
                  >
                    {product.stockStatus.replace(/-/g, " ")}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      ...pillBaseStyle,
                      ...getStatusBadgeStyle(product.status),
                      textTransform: "capitalize"
                    }}
                  >
                    {product.status}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      ...pillBaseStyle,
                      background: product.featured ? "#dcfce7" : "#e2e8f0",
                      color: product.featured ? "#166534" : "#475569"
                    }}
                  >
                    {product.featured ? "Featured" : "Standard"}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <a href={buildStorefrontProductUrl(product.slug)} target="_blank" rel="noreferrer" style={viewActionLinkStyle}>
                      View
                    </a>
                    <Link to={`/dashboard/products/${product.slug}/edit`} style={editActionLinkStyle}>
                      Edit
                    </Link>
                    <button type="button" onClick={() => handleDelete(product.id)} style={deleteActionStyle}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!paginatedProducts.length ? (
              <tr>
                <td colSpan="10" style={{ ...tableCellStyle, textAlign: "center", color: "#64748b", padding: "32px 16px" }}>
                  No products found for the selected search and filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section style={paginationCardStyle}>
        <div>
          <strong>{`Page ${safeCurrentPage} of ${totalPages}`}</strong>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            {filteredProducts.length
              ? `Showing products ${pageStart + 1} to ${pageEnd} out of ${filteredProducts.length}.`
              : "No products available on this page."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            disabled={safeCurrentPage === 1}
            style={{
              ...paginationButtonStyle,
              opacity: safeCurrentPage === 1 ? 0.5 : 1,
              cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer"
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            disabled={safeCurrentPage === totalPages}
            style={{
              ...paginationButtonStyle,
              opacity: safeCurrentPage === totalPages ? 0.5 : 1,
              cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer"
            }}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

const toolbarCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: "18px",
  display: "grid",
  gap: "18px"
};

const paginationCardStyle = {
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap"
};

const tableHeaderStyle = {
  padding: "14px 16px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: "14px"
};

const tableCellStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "top"
};

const filterInputStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  boxSizing: "border-box"
};

const pillBaseStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700
};

const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
  fontSize: "13px"
};

const primaryToolbarLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  padding: "0 16px",
  background: "#16a34a",
  color: "#fff",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: 700
};

const secondaryToolbarButtonStyle = {
  minHeight: "40px",
  padding: "0 16px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer"
};

const viewActionLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "8px",
  background: "#eff6ff",
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 700
};

const editActionLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "8px",
  background: "#16a34a",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700
};

const deleteActionStyle = {
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer"
};

const paginationButtonStyle = {
  minHeight: "40px",
  padding: "0 16px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: 700
};

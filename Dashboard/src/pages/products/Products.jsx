import React from "react";
import { Link } from "react-router-dom";
import { FaEdit, FaExternalLinkAlt, FaPlus, FaTasks, FaTrash, FaUndo } from "react-icons/fa";
import products from "../../data/products";
import { deleteProduct, fetchProducts } from "../../api/adminApi";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import PermissionGate from "../../components/access/PermissionGate";
import { canAccess } from "../../utils/accessControl";
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

function ProductThumbnail({ src, alt }) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <span className="dashboard-product-thumb is-empty" aria-hidden="true">
        {String(alt || "P").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="dashboard-product-thumb"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
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
  const [pagination, setPagination] = React.useState({ page: 1, limit: 10, total: products.length, totalPages: 1 });
  const [facets, setFacets] = React.useState(null);
  const canEditProducts = canAccess("products", "edit");
  const canDeleteProducts = canAccess("products", "delete");

  const categories = React.useMemo(
    () => ["all", ...new Set((facets?.categories?.map((category) => category.value) || tableProducts.map((product) => product.category)).filter(Boolean))],
    [facets, tableProducts]
  );
  const brands = React.useMemo(
    () => ["all", ...new Set((facets?.brands?.map((brand) => brand.value) || tableProducts.map((product) => product.brand)).filter(Boolean))],
    [facets, tableProducts]
  );

  const filteredProducts = React.useMemo(() => {
    return tableProducts;
  }, [tableProducts]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, brandFilter, stockFilter, statusFilter, rowsPerPage]);

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredProducts.length ? ((safeCurrentPage - 1) * rowsPerPage) : 0;
  const paginatedProducts = filteredProducts;
  const pageEnd = filteredProducts.length ? pageStart + filteredProducts.length : 0;

  const handleDelete = async (productId) => {
    try {
      await deleteProduct(productId);
      loadProducts();
    } catch {
      setSourceMessage("Delete failed. Check your permissions and backend connection.");
    }
  };

  const loadProducts = React.useCallback(async ({ showFallbackMessage = true } = {}) => {
    try {
      const response = await fetchProducts({
        page: currentPage,
        limit: rowsPerPage,
        search: searchTerm,
        categorySlug: categoryFilter === "all" ? "" : categoryFilter,
        brand: brandFilter === "all" ? "" : brandFilter,
        availability: stockFilter === "all" ? "" : stockFilter === "in-stock" ? "in-stock" : stockFilter === "out-of-stock" ? "out-of-stock" : "",
        status: statusFilter === "all" ? "" : statusFilter === "active" ? "active" : "draft"
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setTableProducts(rows.map(normalizeProductRow));
      setPagination(response.data?.pagination || { page: currentPage, limit: rowsPerPage, total: rows.length, totalPages: 1 });
      setFacets(response.data?.facets || null);
      setSourceMessage("Products loaded from backend with server-side pagination.");
    } catch {
      if (showFallbackMessage) {
        setTableProducts(products);
        setPagination({ page: 1, limit: products.length, total: products.length, totalPages: 1 });
        setFacets(null);
        setSourceMessage("Backend products are unavailable, so local catalog preview is shown.");
      }
    }
  }, [brandFilter, categoryFilter, currentPage, rowsPerPage, searchTerm, statusFilter, stockFilter]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useAutoRefresh(() => loadProducts({ showFallbackMessage: false }));

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setBrandFilter("all");
    setStockFilter("all");
    setStatusFilter("all");
    setRowsPerPage(10);
  };

  return (
    <section className="dashboard-page-shell dashboard-admin-page">
      <div className="dashboard-page-heading">
        <div>
          <h2 style={{ margin: 0 }}>Products</h2>
          <p className="dashboard-page-copy">
            Search, filter, review, and manage your catalog from one table.
          </p>
          <p className="dashboard-source-message">
            {sourceMessage}
          </p>
        </div>

        <div className="dashboard-toolbar-actions">
          <button type="button" onClick={resetFilters} className="dashboard-secondary-button">
            <FaUndo aria-hidden="true" />
            Reset Filters
          </button>
          <Link to="/dashboard/products/inventory-manager" className="dashboard-secondary-button">
            <FaTasks aria-hidden="true" />
            Inventory Manager
          </Link>
          <PermissionGate module="products" action="create">
            <Link to="/dashboard/products/new" className="dashboard-primary-button">
              <FaPlus aria-hidden="true" />
              Add Product
            </Link>
          </PermissionGate>
        </div>
      </div>

      <section className="dashboard-filter-panel">
        <div className="dashboard-filter-grid">
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

        <div className="dashboard-table-summary">
          <div className="dashboard-chip-row-tight">
            <span style={summaryPillStyle}>{`Total: ${pagination.total}`}</span>
            <span style={summaryPillStyle}>{`Loaded: ${filteredProducts.length}`}</span>
            <span style={summaryPillStyle}>{`Showing: ${filteredProducts.length ? `${pageStart + 1}-${pageEnd}` : "0"}`}</span>
          </div>
          <p>
            Use the action buttons available for your role to view, edit, or delete a product entry.
          </p>
        </div>
      </section>

      <div className="dashboard-table-card">
        <table className="dashboard-data-table dashboard-products-admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="dashboard-product-cell">
                    <ProductThumbnail src={product.image} alt={product.name} />
                    <div className="dashboard-product-copy">
                      <strong>{product.name}</strong>
                      <span>{product.slug}</span>
                    </div>
                  </div>
                </td>
                <td>{product.brand}</td>
                <td>{product.category}</td>
                <td className="dashboard-muted-cell">{product.sku}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>
                  <div className="dashboard-stock-cell">
                    <strong>{product.stock}</strong>
                    <span>
                      {product.stockStatus.replace(/-/g, " ")}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      ...pillBaseStyle,
                      ...getStockBadgeStyle(product.stockStatus),
                      textTransform: "capitalize"
                    }}
                  >
                    {product.stockStatus.replace(/-/g, " ")}
                  </span>
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
                <td>
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
                <td>
                  <div className="dashboard-row-actions">
                    <a href={buildStorefrontProductUrl(product.slug)} target="_blank" rel="noreferrer" className="dashboard-icon-action is-view">
                      <FaExternalLinkAlt aria-hidden="true" />
                      View
                    </a>
                    {canEditProducts ? (
                      <Link to={`/dashboard/products/${product.slug}/edit`} className="dashboard-icon-action is-edit">
                        <FaEdit aria-hidden="true" />
                        Edit
                      </Link>
                    ) : null}
                    {canDeleteProducts ? (
                      <button type="button" onClick={() => handleDelete(product.id)} className="dashboard-icon-action is-delete">
                        <FaTrash aria-hidden="true" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!paginatedProducts.length ? (
              <tr>
                <td colSpan="9" className="dashboard-empty-table-cell">
                  No products found for the selected search and filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="dashboard-pagination-card">
        <div>
          <strong>{`Page ${safeCurrentPage} of ${totalPages}`}</strong>
          <p>
            {filteredProducts.length
              ? `Showing products ${pageStart + 1} to ${pageEnd} out of ${pagination.total}.`
              : "No products available on this page."}
          </p>
        </div>

        <div className="dashboard-toolbar-actions">
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            disabled={safeCurrentPage === 1}
            className="dashboard-secondary-button"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            disabled={safeCurrentPage === totalPages}
            className="dashboard-secondary-button"
          >
            Next
          </button>
        </div>
      </section>
    </section>
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

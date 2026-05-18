import React from "react";
import { Link } from "react-router-dom";
import { FaEdit, FaExternalLinkAlt, FaGripVertical, FaPlus, FaTasks, FaTrash, FaUndo } from "react-icons/fa";
import { deleteProduct, fetchProducts, updateProduct } from "../../api/adminApi";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import PermissionGate from "../../components/access/PermissionGate";
import { canAccess } from "../../utils/accessControl";
import { buildStorefrontProductUrl, formatCurrency } from "../../utils/storefront";

const rowsPerPageOptions = [10, 20, 50, 100];

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
    image: product.imageUrl || product.image || "",
    name: product.name,
    brand: product.brand,
    category: product.categoryName || product.category,
    sku: product.asin || product.sku || product.slug,
    price: Number(product.price || 0),
    stock,
    stockStatus,
    status: product.status === "active" ? "active" : "inactive",
    featured: Boolean(product.featured || product.featuredProduct),
    sortOrder: Number(product.sortOrder || 0)
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
  const [tableProducts, setTableProducts] = React.useState([]);
  const [sourceMessage, setSourceMessage] = React.useState("Products load from backend only.");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [brandFilter, setBrandFilter] = React.useState("all");
  const [stockFilter, setStockFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(50);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [selectedProductIds, setSelectedProductIds] = React.useState([]);
  const [bulkProductAction, setBulkProductAction] = React.useState("");
  const [runningBulkAction, setRunningBulkAction] = React.useState(false);
  const [updatingProductId, setUpdatingProductId] = React.useState("");
  const [draggedProductId, setDraggedProductId] = React.useState("");
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
  const visibleProductIds = React.useMemo(() => paginatedProducts.map((product) => String(product.id)), [paginatedProducts]);
  const selectedVisibleCount = visibleProductIds.filter((id) => selectedProductIds.includes(id)).length;
  const isCurrentPageSelected = visibleProductIds.length > 0 && selectedVisibleCount === visibleProductIds.length;

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Delete product "${product.name}"?`);
    if (!confirmed) return;

    try {
      await deleteProduct(product.id);
      setSelectedProductIds((current) => current.filter((id) => String(id) !== String(product.id)));
      setSourceMessage("Product deleted successfully.");
      loadProducts();
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Delete failed. Check your permissions and backend connection.");
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
        status: statusFilter === "all" ? "" : statusFilter === "active" ? "active" : "draft",
        sort: "manual"
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setTableProducts(rows.map(normalizeProductRow));
      setPagination(response.data?.pagination || { page: currentPage, limit: rowsPerPage, total: rows.length, totalPages: 1 });
      setFacets(response.data?.facets || null);
      setSourceMessage("Products loaded from backend with server-side pagination.");
    } catch {
      if (showFallbackMessage) {
        setTableProducts([]);
        setPagination({ page: 1, limit: rowsPerPage, total: 0, totalPages: 1 });
        setFacets(null);
        setSourceMessage("Backend products are unavailable. No local product preview is shown.");
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
    setRowsPerPage(50);
    setSelectedProductIds([]);
  };

  const toggleSelectedProduct = (productId) => {
    const id = String(productId);
    setSelectedProductIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleCurrentPageSelection = () => {
    setSelectedProductIds((current) => {
      if (isCurrentPageSelected) return current.filter((id) => !visibleProductIds.includes(id));
      return Array.from(new Set([...current, ...visibleProductIds]));
    });
  };

  const handleToggleProductStatus = async (product) => {
    const nextStatus = product.status === "active" ? "draft" : "active";
    setUpdatingProductId(product.id);
    try {
      await updateProduct(product.id, { status: nextStatus });
      setSourceMessage(`Product marked ${nextStatus === "active" ? "active" : "inactive"}.`);
      await loadProducts({ showFallbackMessage: false });
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Status update failed. Check permissions and backend connection.");
    } finally {
      setUpdatingProductId("");
    }
  };

  const handleBulkStatus = async (status) => {
    if (!selectedProductIds.length) return;
    try {
      await Promise.all(selectedProductIds.map((productId) => updateProduct(productId, { status })));
      setSourceMessage(`${selectedProductIds.length} product(s) updated.`);
      setSelectedProductIds([]);
      await loadProducts();
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Bulk status update failed. Check permissions and backend connection.");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedProductIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedProductIds.length} selected product(s)?`);
    if (!confirmed) return;
    try {
      await Promise.all(selectedProductIds.map((productId) => deleteProduct(productId)));
      setSourceMessage(`${selectedProductIds.length} product(s) deleted.`);
      setSelectedProductIds([]);
      await loadProducts();
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Bulk delete failed. Check permissions and backend connection.");
      await loadProducts();
    }
  };

  const handleApplyBulkProductAction = async () => {
    if (!bulkProductAction || !selectedProductIds.length || runningBulkAction) return;

    setRunningBulkAction(true);
    try {
      if (bulkProductAction === "active") {
        await handleBulkStatus("active");
      } else if (bulkProductAction === "inactive") {
        await handleBulkStatus("draft");
      } else if (bulkProductAction === "delete") {
        await handleBulkDelete();
      }
      setBulkProductAction("");
    } finally {
      setRunningBulkAction(false);
    }
  };

  const persistProductOrder = async (orderedProducts) => {
    const sequencedProducts = orderedProducts.map((product, index) => ({
      ...product,
      sortOrder: pageStart + index + 1
    }));

    setTableProducts(sequencedProducts);
    try {
      await Promise.all(sequencedProducts.map((product) => updateProduct(product.id, { sortOrder: product.sortOrder })));
      setSourceMessage("Product sort order saved.");
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Product sort order could not be saved.");
      await loadProducts({ showFallbackMessage: false });
    }
  };

  const handleProductDrop = async (targetProductId) => {
    if (!draggedProductId || String(draggedProductId) === String(targetProductId)) return;
    const orderedProducts = [...paginatedProducts];
    const fromIndex = orderedProducts.findIndex((product) => String(product.id) === String(draggedProductId));
    const toIndex = orderedProducts.findIndex((product) => String(product.id) === String(targetProductId));
    if (fromIndex < 0 || toIndex < 0) return;

    const [movedProduct] = orderedProducts.splice(fromIndex, 1);
    orderedProducts.splice(toIndex, 0, movedProduct);
    setDraggedProductId("");
    await persistProductOrder(orderedProducts);
  };

  const handleProductSortOrderChange = async (product, value) => {
    const nextSortOrder = Math.max(0, Math.round(Number(value || 0)));
    if (nextSortOrder === Number(product.sortOrder || 0)) return;
    setUpdatingProductId(product.id);
    try {
      await updateProduct(product.id, { sortOrder: nextSortOrder });
      setTableProducts((current) =>
        current
          .map((item) => item.id === product.id ? { ...item, sortOrder: nextSortOrder } : item)
          .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || String(left.name).localeCompare(String(right.name)))
      );
      setSourceMessage("Product sort order saved.");
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Product sort order could not be saved.");
    } finally {
      setUpdatingProductId("");
    }
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
            <span style={summaryPillStyle}>{`Selected: ${selectedProductIds.length}`}</span>
          </div>
          <p>
            Use the action buttons available for your role to view, edit, or delete a product entry.
          </p>
        </div>
      </section>

      <section className="dashboard-filter-panel" style={bulkPanelStyle}>
        <strong>{`${selectedProductIds.length} product(s) selected`}</strong>
        <select
          value={bulkProductAction}
          onChange={(event) => setBulkProductAction(event.target.value)}
          className="dashboard-bulk-action-select"
          disabled={!selectedProductIds.length || runningBulkAction}
          aria-label="Bulk product action"
        >
          <option value="">Select bulk action</option>
          {canEditProducts ? <option value="active">Mark selected active</option> : null}
          {canEditProducts ? <option value="inactive">Mark selected inactive</option> : null}
          {canDeleteProducts ? <option value="delete">Delete selected</option> : null}
        </select>
        <button
          type="button"
          className="dashboard-primary-button"
          onClick={handleApplyBulkProductAction}
          disabled={!selectedProductIds.length || !bulkProductAction || runningBulkAction}
        >
          {runningBulkAction ? "Applying..." : "Apply"}
        </button>
        {selectedProductIds.length ? (
          <button type="button" className="dashboard-secondary-button" onClick={() => setSelectedProductIds([])} disabled={runningBulkAction}>
            Clear
          </button>
        ) : null}
      </section>

      {sourceMessage ? (
        <section className="dashboard-action-feedback" aria-live="polite">
          {sourceMessage}
        </section>
      ) : null}

      <div className="dashboard-table-card">
        <table className="dashboard-data-table dashboard-products-admin-table">
          <thead>
            <tr>
              <th aria-label="Drag handle"></th>
              <th>
                <input
                  type="checkbox"
                  checked={isCurrentPageSelected}
                  onChange={toggleCurrentPageSelection}
                  aria-label="Select all products on this page"
                />
              </th>
              <th>Product</th>
              <th>Brand</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Sort Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => (
              <tr
                key={product.id}
                draggable={canEditProducts}
                onDragStart={() => setDraggedProductId(String(product.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleProductDrop(product.id)}
                className={String(draggedProductId) === String(product.id) ? "dashboard-row-dragging" : ""}
              >
                <td>
                  <button type="button" className="dashboard-drag-handle" title="Drag to reorder" disabled={!canEditProducts}>
                    <FaGripVertical aria-hidden="true" />
                  </button>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(String(product.id))}
                    onChange={() => toggleSelectedProduct(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </td>
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
                  <input
                    type="number"
                    min="0"
                    defaultValue={product.sortOrder}
                    className="dashboard-sort-input"
                    disabled={!canEditProducts || updatingProductId === product.id}
                    onBlur={(event) => handleProductSortOrderChange(product, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    aria-label={`Sort order for ${product.name}`}
                  />
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
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(product)}
                          className="dashboard-icon-action is-status"
                          disabled={updatingProductId === product.id}
                        >
                          {updatingProductId === product.id ? "Saving..." : product.status === "active" ? "Inactive" : "Active"}
                        </button>
                        <Link to={`/dashboard/products/${product.slug}/edit`} className="dashboard-icon-action is-edit">
                          <FaEdit aria-hidden="true" />
                          Edit
                        </Link>
                      </>
                    ) : null}
                    {canDeleteProducts ? (
                      <button type="button" onClick={() => handleDelete(product)} className="dashboard-icon-action is-delete">
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
                <td colSpan="12" className="dashboard-empty-table-cell">
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

const bulkPanelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
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

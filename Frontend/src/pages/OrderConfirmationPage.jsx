import React from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { formatCurrency } from "../utils/storefront";

export default function OrderConfirmationPage({ context }) {
  const { orderNumber } = useParams();
  const location = useLocation();
  const stateOrder = location.state || null;
  const storedItems = context.orders.filter((order) => order.orderNumber === orderNumber);
  const items = stateOrder?.items || storedItems;

  if (!items.length) {
    return <Navigate to="/" replace />;
  }

  const firstItem = items[0];
  const orderTotal = Number(stateOrder?.total ?? firstItem.orderTotal ?? items.reduce((sum, item) => sum + Number(item.total || 0), 0));
  const shipping = Number(stateOrder?.shipping ?? firstItem.shipping ?? 0);
  const discount = Number(stateOrder?.discount ?? firstItem.discount ?? 0);
  const subtotal = Math.max(0, orderTotal + discount - shipping);
  const deliveryAddress = stateOrder?.deliveryAddress || firstItem.deliveryAddress || "Saved delivery address";

  return (
    <main className="container order-confirmation-page">
      <section className="confirmation-hero">
        <div className="confirmation-status-mark" aria-hidden="true">✓</div>
        <div>
          <p className="eyebrow">Order Confirmed</p>
          <h1>Thank you for your order</h1>
          <p>{`Your order ${orderNumber} has been placed successfully.`}</p>
        </div>
      </section>

      <section className="confirmation-layout">
        <article className="confirmation-card">
          <div className="confirmation-card-head">
            <h2>Order Summary</h2>
            <span>{orderNumber}</span>
          </div>
          <div className="confirmation-items">
            {items.map((item, index) => (
              <div key={`${item.slug}:${index}`} className="confirmation-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{`${item.category} - Qty: ${item.quantity}`}</p>
                </div>
                <strong>{formatCurrency(item.total, context)}</strong>
              </div>
            ))}
          </div>
          <div className="confirmation-totals">
            <div><span>Subtotal</span><strong>{formatCurrency(subtotal, context)}</strong></div>
            {discount > 0 ? <div><span>{`Coupon${firstItem.couponCode ? ` (${firstItem.couponCode})` : ""}`}</span><strong>{`-${formatCurrency(discount, context)}`}</strong></div> : null}
            <div><span>Shipping</span><strong>{shipping ? formatCurrency(shipping, context) : "Free"}</strong></div>
            <div className="confirmation-total-row"><span>Total</span><strong>{formatCurrency(orderTotal, context)}</strong></div>
          </div>
        </article>

        <aside className="confirmation-card">
          <h2>Delivery Details</h2>
          <div className="confirmation-detail-list">
            <div><span>Status</span><strong>Order Confirmed</strong></div>
            <div><span>Delivery Address</span><strong>{deliveryAddress}</strong></div>
            <div><span>Payment</span><strong>{stateOrder?.paymentMethod || firstItem.paymentMethod || "Selected at checkout"}</strong></div>
            <div><span>Contact</span><strong>{stateOrder?.contact || firstItem.contact || "Provided at checkout"}</strong></div>
          </div>
          <div className="confirmation-actions">
            <Link className="primary-button" to="/track-order">Track Order</Link>
            <Link className="secondary-button" to="/collections">Continue Shopping</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

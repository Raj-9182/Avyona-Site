# Avyona Backend

This backend is fully separate from the React storefront and lives entirely inside the top-level `Backend` folder.

## Final stack

- Node.js
- Express
- MySQL
- JWT authentication
- Multer for local uploads

## Setup

```bash
cd Backend
npm install
copy .env.example .env
```

Update `.env` with your MySQL credentials and JWT secret.

## Run

```bash
npm run dev
```

Server default:

`http://localhost:4000`

API base:

`http://localhost:4000/api/v1`

## Important starter flow

1. Create the MySQL database.
2. Run `sql/schema.sql`
3. Start the backend.
4. Create the first admin using `POST /api/v1/admin/auth/bootstrap`
5. Login using `POST /api/v1/admin/auth/login`

## Main routes

- `GET /api/v1/health`
- `POST /api/v1/admin/auth/bootstrap`
- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `GET /api/v1/categories`
- `GET /api/v1/orders`
- `PATCH /api/v1/orders/:id/status`
- `GET /api/v1/customers`
- `POST /api/v1/uploads/image`

## Order tracking foundation

Orders are now structured to support a dedicated tracking experience:

- `orders.order_number`: public tracking ID / order ID
- `orders.status`: current order status
- `orders.payment_status`: current payment status
- `orders.courier_name`: courier partner, optional
- `orders.expected_delivery_date`: expected delivery estimate
- `order_items`: ordered items linked to the order
- `order_addresses`: delivery address snapshot stored per order
- `order_status_timeline`: full status history for tracking updates

The important design rule is that tracking should read from the timeline table for history, while the `orders.status` field remains the latest summary status.

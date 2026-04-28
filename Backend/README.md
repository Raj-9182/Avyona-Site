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

## Database setup

The project includes a repeatable database setup script that runs the schema and seed files using `mysql2`, so you do not need the MySQL CLI installed.

```bash
cd Backend
npm run db:setup
```

The script creates and seeds:

- admin login
- app settings and homepage settings
- categories and products
- customers and demo orders
- product media, variants, specs, related products, coupons, newsletter, upload assets, and audit log tables

Default seeded admin:

- Email: `sourab@thedoveberry.com`
- Password: `Sourab@1234#Avyona`

## Run

```bash
npm run dev
```

Server default:

`http://localhost:4000`

API base:

`http://localhost:4000/api/v1`

## Important starter flow

1. Start MySQL.
2. Update `.env` if your MySQL credentials are not the local defaults.
3. Run `npm run db:setup`.
4. Start the backend.
5. Login using `POST /api/v1/admin/auth/login` or the dashboard login page.

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
- `GET /api/v1/variant-groups`
- `POST /api/v1/variant-groups`
- `GET /api/v1/categories`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
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

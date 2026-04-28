# Avyona Ecommerce Data Audit

Source document: `c:\Users\SourabKumar\Downloads\ecommerce_complete_data_list (1).docx`

## Executive View

The document is a strong high-level ecommerce data checklist. It correctly covers the main areas needed for a serious product store: products, categories, brands, variants, cart, wishlist, customers, orders, payments, shipping, returns, coupons, reviews, SEO, CMS, leads, notifications, analytics, and security logs.

For a large catalog store, the important correction is to keep this as a normalized data model. These fields should not all be copied into one product table or one dashboard form. Large stores need clean ownership between catalog data, merchandising controls, transactional data, customer data, and marketing/analytics data.

## What Was Already Covered

- Admin login, products, categories, variants, customers, orders, coupons, uploads, app settings, and audit logs already existed in the backend schema.
- The dashboard already has management screens for products, categories, coupons, customers, orders, homepage merchandising, hero banners, featured brands, and settings.
- The frontend is wired to consume active products from the backend and merge them into storefront pages.
- Product publishing has a local-file fallback while MySQL is unavailable, so dashboard publishing can still be tested in development.

## Foundation Added

- Role and permission tables for future staff access control.
- Brand master table for scalable brand/logo management.
- Product catalog fields for SKU, barcode, model number, tax, stock thresholds, reserved/sold stock, visibility flags, and soft delete support.
- Cart, cart item, and wishlist tables.
- Product reviews and product search/filter attribute tables.
- Payment, shipment, and return request tables.
- SEO records, CMS pages, CMS sections, and CMS banners.
- Blog posts, form leads, notifications, and analytics event tables.
- Seed data for admin role assignment and known Avyona storefront brands.

## Professional Corrections To The Document

- `id`, timestamps, status, soft-delete, and audit fields are useful, but not every table needs every field. Junction tables should stay lean.
- `class_name`, `element_id`, and frontend styling identifiers should not become required ecommerce business fields. They belong only in CMS or page builder records when truly needed.
- Product pricing, inventory, media, specifications, and categories should stay in related tables so product records remain fast and manageable.
- Payments, shipments, returns, and refunds should be separate operational records connected to orders.
- Reviews should be moderated with statuses before showing on the storefront.
- SEO should be a separate reusable record model instead of duplicated across every table.
- Analytics should be append-only event data, not mixed into product/customer/order tables.

## Next Build Priorities

1. Connect dashboard brand management to the new `brands` table instead of only homepage settings.
2. Add paginated product APIs for large catalog browsing and admin filtering.
3. Add product media/spec/highlight save support from the Add Product form, not only the primary product row.
4. Add cart/order checkout persistence so storefront transactions are stored in backend tables.
5. Add review moderation and SEO edit screens after the product publishing flow is stable.


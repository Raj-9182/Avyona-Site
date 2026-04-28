USE avyona_admin;

INSERT INTO admins (full_name, email, password_hash, role, is_active)
VALUES (
  'Sourab Kumar',
  'sourab@thedoveberry.com',
  '$2a$10$emBRVSUen../oAczdWrwmuNtoBBwqX2.iCirgGZ51dW5cHU4F1V9q',
  'super_admin',
  1
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  is_active = VALUES(is_active);

INSERT INTO roles (name, display_name, description, status) VALUES
  ('super_admin', 'Super Admin', 'Full control over website, dashboard, products, orders, customers, settings, and reports.', 'active'),
  ('catalog_manager', 'Catalog Manager', 'Manage products, categories, brands, media, and homepage merchandising.', 'active'),
  ('order_manager', 'Order Manager', 'Manage orders, payments, shipping, returns, refunds, and customer support workflows.', 'active'),
  ('marketing_manager', 'Marketing Manager', 'Manage coupons, SEO, CMS content, leads, notifications, and analytics review.', 'active')
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO role_permissions
  (role_id, module_name, can_view, can_create, can_edit, can_delete, can_export, can_approve)
SELECT r.id, module_name, 1, 1, 1, 1, 1, 1
FROM roles r
JOIN (
  SELECT 'dashboard' AS module_name UNION ALL
  SELECT 'products' UNION ALL
  SELECT 'categories' UNION ALL
  SELECT 'brands' UNION ALL
  SELECT 'orders' UNION ALL
  SELECT 'customers' UNION ALL
  SELECT 'coupons' UNION ALL
  SELECT 'homepage' UNION ALL
  SELECT 'settings' UNION ALL
  SELECT 'reports'
) modules
WHERE r.name = 'super_admin'
ON DUPLICATE KEY UPDATE
  can_view = VALUES(can_view),
  can_create = VALUES(can_create),
  can_edit = VALUES(can_edit),
  can_delete = VALUES(can_delete),
  can_export = VALUES(can_export),
  can_approve = VALUES(can_approve);

INSERT INTO admin_roles (admin_id, role_id)
SELECT a.id, r.id
FROM admins a
JOIN roles r ON r.name = 'super_admin'
WHERE a.email = 'sourab@thedoveberry.com'
ON DUPLICATE KEY UPDATE admin_id = VALUES(admin_id);

INSERT INTO app_settings (id, settings_json, updated_by)
VALUES (
  1,
  '{
    "general": {
      "storeName": "Avyona",
      "logoUrl": "/images/optimized/avyona-logo.webp",
      "faviconUrl": "/favicon.ico",
      "brandTagline": "Style that moves with you",
      "supportEmail": "support@avyona.com",
      "supportPhone": "+91 98765 43210",
      "businessAddress": "Bengaluru, Karnataka, India",
      "gstNumber": "29ABCDE1234F1Z5"
    },
    "store": {
      "defaultCurrency": "INR",
      "currencyFormat": "INR 1,999.00",
      "taxInclusion": "inclusive",
      "defaultLanguage": "English",
      "timezone": "Asia/Kolkata",
      "guestCheckoutEnabled": true,
      "accountCreationEnabled": true
    },
    "payment": {
      "codEnabled": true,
      "razorpayEnabled": true,
      "stripeEnabled": false,
      "upiWalletEnabled": true,
      "paymentSuccessRule": "Mark order as confirmed after gateway success",
      "paymentFailureHandling": "Retry allowed and order kept pending",
      "refundSettings": "Manual review before refund approval"
    },
    "shipping": {
      "shippingCharges": "INR 79 standard shipping",
      "freeShippingThreshold": "INR 999",
      "deliveryZones": "India-wide with metro priority zones",
      "deliveryTime": "3 to 5 business days",
      "dispatchTime": "24 to 48 hours",
      "pincodeServiceability": "Enabled for supported pin codes"
    },
    "tracking": {
      "orderStatusFlow": "Pending to Delivered with return states",
      "trackingPageEnabled": true,
      "defaultStatusMessages": "Shown on public tracking timeline",
      "expectedDeliveryLogic": "Calculated from dispatch and shipping settings",
      "autoStatusUpdates": false,
      "orderIdIsTrackingId": true,
      "orderIdPrefix": "AVY",
      "orderIdFormatLogic": "Prefix plus numeric sequence, for example AVY12345"
    },
    "notifications": {
      "orderPlacedEmailEnabled": true,
      "orderShippedEmailEnabled": true,
      "orderDeliveredEmailEnabled": true,
      "whatsappNotificationsEnabled": false,
      "smsNotificationsEnabled": false,
      "newOrderAlertEnabled": true,
      "lowStockAlertEnabled": true
    },
    "security": {
      "superAdminEnabled": true,
      "staffRoleEnabled": true,
      "productsAccess": "Configurable by role",
      "ordersAccess": "Configurable by role",
      "settingsAccess": "Restricted to Super Admin",
      "passwordRules": "Strong password policy required",
      "sessionTimeout": "30 minutes of inactivity"
    }
  }',
  NULL
)
ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json);

INSERT INTO categories (
  name,
  slug,
  parent_id,
  description,
  image_url,
  banner_image_url,
  status,
  show_in_menu,
  featured_category,
  sort_order,
  meta_title,
  meta_description,
  meta_keywords
) VALUES
('Personal Audio', 'personal-audio', NULL, 'Headphones, earbuds, and neckbands for daily listening.', '/images/optimized/personal-audio-thumb.webp', '/images/optimized/personal-audio-banner.webp', 'active', 1, 1, 1, 'Personal Audio Collection | Avyona', 'Shop personal audio products including headphones, earbuds, and neckbands.', 'personal audio, headphones, earbuds, neckbands'),
('Professional Audio', 'professional-audio', NULL, 'Creator and studio-style audio gear.', '/images/optimized/professional-audio-thumb.webp', '/images/optimized/professional-audio-banner.webp', 'active', 1, 1, 2, 'Professional Audio Collection | Avyona', 'Discover microphones, monitors, and creator-focused professional audio gear.', 'professional audio, studio audio, creator gear'),
('Digital Camera', 'digital-camera', NULL, 'Compact and creator-friendly digital cameras.', '/images/optimized/digital-camera-thumb.webp', '/images/optimized/digital-camera-banner.webp', 'active', 1, 1, 3, 'Digital Camera Collection | Avyona', 'Browse digital cameras for travel, family, and creator use.', 'digital camera, compact camera, creator camera'),
('Security Camera', 'security-camera', NULL, 'Indoor and outdoor smart camera setups.', '/images/optimized/security-camera-thumb.webp', '/images/optimized/security-camera-banner.webp', 'active', 1, 0, 4, 'Security Camera Collection | Avyona', 'Explore indoor and outdoor security camera collections.', 'security camera, smart camera, surveillance'),
('Avyona Digital Photo Frames', 'digital-photo-frames', NULL, 'Smart digital frames for gifting and family memories.', '/images/optimized/digital-frame-thumb.webp', '/images/optimized/digital-frame-banner.webp', 'active', 1, 1, 5, 'Digital Photo Frames Collection | Avyona', 'Shop digital photo frames for gifting, family sharing, and home display.', 'digital photo frame, smart frame, gifting frame'),
('Reading Light', 'reading-light', NULL, 'Portable and bedside reading lights.', '/images/optimized/reading-light-thumb.webp', '/images/optimized/reading-light-banner.webp', 'active', 1, 0, 6, 'Reading Light Collection | Avyona', 'Find clip-on and bedside reading lights for everyday use.', 'reading light, bedside lamp, clip light')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  parent_id = VALUES(parent_id),
  description = VALUES(description),
  image_url = VALUES(image_url),
  banner_image_url = VALUES(banner_image_url),
  status = VALUES(status),
  show_in_menu = VALUES(show_in_menu),
  featured_category = VALUES(featured_category),
  sort_order = VALUES(sort_order),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  meta_keywords = VALUES(meta_keywords),
  is_active = IF(VALUES(status) = 'active', 1, 0);

INSERT INTO categories (
  name,
  slug,
  parent_id,
  description,
  image_url,
  banner_image_url,
  status,
  show_in_menu,
  featured_category,
  sort_order,
  meta_title,
  meta_description,
  meta_keywords
)
SELECT
  'Earbuds',
  'earbuds',
  parent.id,
  'Wireless and everyday earbuds under Personal Audio.',
  '/images/optimized/earbuds-thumb.webp',
  '/images/optimized/earbuds-banner.webp',
  'active',
  1,
  0,
  11,
  'Earbuds Collection | Avyona',
  'Browse earbuds under the Personal Audio collection.',
  'earbuds, wireless earbuds, personal audio'
FROM categories parent
WHERE parent.slug = 'personal-audio'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  description = VALUES(description),
  image_url = VALUES(image_url),
  banner_image_url = VALUES(banner_image_url),
  status = VALUES(status),
  show_in_menu = VALUES(show_in_menu),
  featured_category = VALUES(featured_category),
  sort_order = VALUES(sort_order),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  meta_keywords = VALUES(meta_keywords),
  is_active = IF(VALUES(status) = 'active', 1, 0);

INSERT INTO categories (
  name,
  slug,
  parent_id,
  description,
  image_url,
  banner_image_url,
  status,
  show_in_menu,
  featured_category,
  sort_order,
  meta_title,
  meta_description,
  meta_keywords
)
SELECT
  'Headphones',
  'headphones',
  parent.id,
  'Over-ear and on-ear headphones under Personal Audio.',
  '/images/optimized/headphones-thumb.webp',
  '/images/optimized/headphones-banner.webp',
  'active',
  1,
  0,
  12,
  'Headphones Collection | Avyona',
  'Browse headphones under the Personal Audio collection.',
  'headphones, wireless headphones, personal audio'
FROM categories parent
WHERE parent.slug = 'personal-audio'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  description = VALUES(description),
  image_url = VALUES(image_url),
  banner_image_url = VALUES(banner_image_url),
  status = VALUES(status),
  show_in_menu = VALUES(show_in_menu),
  featured_category = VALUES(featured_category),
  sort_order = VALUES(sort_order),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  meta_keywords = VALUES(meta_keywords),
  is_active = IF(VALUES(status) = 'active', 1, 0);

INSERT INTO categories (
  name,
  slug,
  parent_id,
  description,
  image_url,
  banner_image_url,
  status,
  show_in_menu,
  featured_category,
  sort_order,
  meta_title,
  meta_description,
  meta_keywords
)
SELECT
  'DSLR Cameras',
  'dslr-cameras',
  parent.id,
  'DSLR camera collection under Digital Camera.',
  '/images/optimized/dslr-thumb.webp',
  '/images/optimized/dslr-banner.webp',
  'active',
  1,
  0,
  31,
  'DSLR Cameras Collection | Avyona',
  'Explore DSLR camera options under the Digital Camera collection.',
  'dslr cameras, digital camera, photography'
FROM categories parent
WHERE parent.slug = 'digital-camera'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  description = VALUES(description),
  image_url = VALUES(image_url),
  banner_image_url = VALUES(banner_image_url),
  status = VALUES(status),
  show_in_menu = VALUES(show_in_menu),
  featured_category = VALUES(featured_category),
  sort_order = VALUES(sort_order),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  meta_keywords = VALUES(meta_keywords),
  is_active = IF(VALUES(status) = 'active', 1, 0);

INSERT INTO brands (name, slug, logo_url, description, country, is_authorized, status, sort_order) VALUES
  ('Avyona', 'avyona', '/images/optimized/avyona-logo.webp', 'Avyona owned and curated electronics products.', 'India', 1, 'active', 1),
  ('Sony', 'sony', '/images/optimized/sony.webp', 'Audio and creator electronics from Sony.', 'Japan', 1, 'active', 2),
  ('Kodak', 'kodak', '/images/optimized/kodak.webp', 'Camera and imaging products from Kodak.', 'United States', 1, 'active', 3),
  ('JBL', 'jbl', '/images/optimized/jbl.webp', 'Consumer audio products from JBL.', 'United States', 1, 'active', 4),
  ('AKG', 'akg', '/images/optimized/akg.webp', 'Professional and studio audio products from AKG.', 'Austria', 1, 'active', 5),
  ('Wyze', 'wyze', '/images/optimized/wyze.webp', 'Smart home and security camera products from Wyze.', 'United States', 1, 'active', 6),
  ('Glocusent', 'glocusent', '/images/optimized/glocuent.webp', 'Reading lights and personal utility electronics.', 'United States', 1, 'active', 7)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  logo_url = VALUES(logo_url),
  description = VALUES(description),
  country = VALUES(country),
  is_authorized = VALUES(is_authorized),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO products
  (category_id, asin, name, slug, brand, short_description, description, price, mrp, stock_quantity, rating, review_count, image_url, status)
SELECT c.id, 'B0000AURA10', 'Avyona Aura 10 Frame', 'avyona-aura-10-frame', 'Avyona',
  '10.1-inch HD IPS touchscreen frame',
  'Connected digital photo frame with app sharing, auto rotate, and built-in storage.',
  8999, 9999, 16, 4.90, 214, '/images/optimized/frame-2.webp', 'active'
FROM categories c
WHERE c.slug = 'digital-photo-frames'
ON DUPLICATE KEY UPDATE
  asin = VALUES(asin),
  category_id = VALUES(category_id),
  price = VALUES(price),
  mrp = VALUES(mrp),
  stock_quantity = VALUES(stock_quantity),
  status = VALUES(status);

INSERT INTO products
  (category_id, asin, name, slug, brand, short_description, description, price, mrp, stock_quantity, rating, review_count, image_url, status)
SELECT c.id, 'B0000KODAK1', 'Kodak ZoomLite Camera', 'kodak-zoomlite-camera', 'Kodak',
  'Travel-friendly compact digital camera',
  'Simple digital camera for family use, travel, and everyday capture.',
  18499, 20999, 11, 4.60, 84, '/images/optimized/camera-1.webp', 'active'
FROM categories c
WHERE c.slug = 'digital-camera'
ON DUPLICATE KEY UPDATE
  asin = VALUES(asin),
  category_id = VALUES(category_id),
  price = VALUES(price),
  mrp = VALUES(mrp),
  stock_quantity = VALUES(stock_quantity),
  status = VALUES(status);

UPDATE products p
JOIN brands b ON LOWER(b.name) = LOWER(p.brand)
SET p.brand_id = b.id
WHERE p.brand_id IS NULL;

INSERT INTO customers (full_name, email, phone, city, state, total_orders, total_spent) VALUES
('Rahul Mehta', 'rahul@example.com', '9876543210', 'Hyderabad', 'Telangana', 2, 16498),
('Priya Sharma', 'priya@example.com', '9123456780', 'Bengaluru', 'Karnataka', 1, 8999)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  city = VALUES(city),
  state = VALUES(state),
  total_orders = VALUES(total_orders),
  total_spent = VALUES(total_spent);

INSERT INTO orders
  (customer_id, order_number, status, payment_status, payment_method, courier_name, expected_delivery_date, subtotal, shipping_fee, total_amount)
SELECT c.id, 'AVY-1001', 'shipped', 'paid', 'PhonePe', 'Blue Dart', '2026-04-24 18:00:00', 8999, 0, 8999
FROM customers c
WHERE c.email = 'rahul@example.com'
ON DUPLICATE KEY UPDATE
  customer_id = VALUES(customer_id),
  status = VALUES(status),
  payment_status = VALUES(payment_status),
  payment_method = VALUES(payment_method),
  courier_name = VALUES(courier_name),
  expected_delivery_date = VALUES(expected_delivery_date),
  subtotal = VALUES(subtotal),
  shipping_fee = VALUES(shipping_fee),
  total_amount = VALUES(total_amount);

INSERT INTO orders
  (customer_id, order_number, status, payment_status, payment_method, courier_name, expected_delivery_date, subtotal, shipping_fee, total_amount)
SELECT c.id, 'AVY-1002', 'confirmed', 'cod_pending', 'Cash on Delivery', NULL, '2026-04-27 20:00:00', 8346, 99, 8445
FROM customers c
WHERE c.email = 'priya@example.com'
ON DUPLICATE KEY UPDATE
  customer_id = VALUES(customer_id),
  status = VALUES(status),
  payment_status = VALUES(payment_status),
  payment_method = VALUES(payment_method),
  courier_name = VALUES(courier_name),
  expected_delivery_date = VALUES(expected_delivery_date),
  subtotal = VALUES(subtotal),
  shipping_fee = VALUES(shipping_fee),
  total_amount = VALUES(total_amount);

INSERT INTO order_addresses
  (order_id, address_type, full_name, email, phone, line1, line2, landmark, city, state, pincode, country)
SELECT o.id, 'delivery', 'Rahul Mehta', 'rahul@example.com', '9876543210', 'Flat 402, Lakeview Residency', 'Madhapur', 'Near Inorbit Mall', 'Hyderabad', 'Telangana', '500081', 'India'
FROM orders o
WHERE o.order_number = 'AVY-1001'
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  email = VALUES(email),
  phone = VALUES(phone),
  line1 = VALUES(line1),
  line2 = VALUES(line2),
  landmark = VALUES(landmark),
  city = VALUES(city),
  state = VALUES(state),
  pincode = VALUES(pincode),
  country = VALUES(country);

INSERT INTO order_addresses
  (order_id, address_type, full_name, email, phone, line1, line2, landmark, city, state, pincode, country)
SELECT o.id, 'delivery', 'Priya Sharma', 'priya@example.com', '9123456780', '22, Green Park Avenue', NULL, 'Whitefield Main Road', 'Bengaluru', 'Karnataka', '560066', 'India'
FROM orders o
WHERE o.order_number = 'AVY-1002'
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  email = VALUES(email),
  phone = VALUES(phone),
  line1 = VALUES(line1),
  line2 = VALUES(line2),
  landmark = VALUES(landmark),
  city = VALUES(city),
  state = VALUES(state),
  pincode = VALUES(pincode),
  country = VALUES(country);

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'confirmed', 'Order placed', 'Customer completed checkout successfully.', '2026-04-18 10:25:00'
FROM orders o
WHERE o.order_number = 'AVY-1001'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.status = 'confirmed'
      AND t.event_time = '2026-04-18 10:25:00'
  );

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'paid', 'Payment captured', 'PhonePe payment confirmed.', '2026-04-18 10:27:00'
FROM orders o
WHERE o.order_number = 'AVY-1001'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.status = 'paid'
      AND t.event_time = '2026-04-18 10:27:00'
  );

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'packed', 'Packed', 'Warehouse packed the order.', '2026-04-19 09:40:00'
FROM orders o
WHERE o.order_number = 'AVY-1001'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.status = 'packed'
      AND t.event_time = '2026-04-19 09:40:00'
  );

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'shipped', 'Shipped', 'Shipment handed over to courier partner.', '2026-04-20 14:15:00'
FROM orders o
WHERE o.order_number = 'AVY-1001'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.status = 'shipped'
      AND t.event_time = '2026-04-20 14:15:00'
  );

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'confirmed', 'Order placed', 'COD order placed from website.', '2026-04-19 16:40:00'
FROM orders o
WHERE o.order_number = 'AVY-1002'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.status = 'confirmed'
      AND t.event_time = '2026-04-19 16:40:00'
  );

INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
SELECT o.id, 'confirmed', 'Order verified', 'Customer verified by support team.', '2026-04-19 16:55:00'
FROM orders o
WHERE o.order_number = 'AVY-1002'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_timeline t
    WHERE t.order_id = o.id
      AND t.title = 'Order verified'
      AND t.event_time = '2026-04-19 16:55:00'
  );

INSERT INTO coupons (
  code,
  title,
  description,
  discount_type,
  discount_value,
  minimum_order_amount,
  maximum_discount_amount,
  usage_limit,
  used_count,
  starts_at,
  ends_at,
  status
) VALUES
  ('SUMMER15', 'Summer Sale', '15% off on personal audio, digital cameras, and reading lights.', 'percentage', 15, 4999, 2500, 500, 126, '2026-04-01 00:00:00', '2026-06-30 23:59:59', 'active'),
  ('FIRST12', 'First Purchase', '12% off for new shoppers across eligible in-stock products.', 'percentage', 12, 2999, 1500, 1000, 284, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active'),
  ('BUNDLE20', 'Bundle Sale', '20% off selected home setup and creator products.', 'percentage', 20, 9999, 4000, 300, 91, '2026-03-01 00:00:00', '2026-08-31 23:59:59', 'active'),
  ('AVYONA500', 'Flat Savings', 'Flat discount for carts above INR 6999.', 'fixed', 500, 6999, 500, 750, 212, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  discount_type = VALUES(discount_type),
  discount_value = VALUES(discount_value),
  minimum_order_amount = VALUES(minimum_order_amount),
  maximum_discount_amount = VALUES(maximum_discount_amount),
  usage_limit = VALUES(usage_limit),
  used_count = VALUES(used_count),
  starts_at = VALUES(starts_at),
  ends_at = VALUES(ends_at),
  status = VALUES(status);

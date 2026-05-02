-- ============================================
-- White House Cafe – Complete Database Schema
-- ============================================
-- ============================================
-- 1. Admins table
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin (password: admin123)
INSERT INTO admins (name, email, password) VALUES
('Admin', 'admin@whitehousecafe.com', '$2y$10$TKh8H1.PfuAa38peVlHf.uXnu/wkFzVEd4RNMM/wATvBOxTJKlce2');

-- ============================================
-- 2. Categories table (only new categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '🍽️',
  description TEXT,
  is_active TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, icon, description, sort_order, is_active) VALUES
('Coffee', '☕', 'Hot & cold coffee beverages', 1, 1),
('Burger', '🍔', 'Tasty veg burgers', 2, 1),
('Milk Shake', '🥤', 'Creamy milkshakes', 3, 1),
('Mojito', '🍹', 'Refreshing mojitos', 4, 1),
('Sandwich', '🥪', 'Grilled sandwiches', 5, 1),
('Fries', '🍟', 'Crispy fries', 6, 1),
('Pizza', '🍕', 'Cheesy pizzas', 7, 1),
('Maggi', '🍜', 'Instant noodle dishes', 8, 1);

-- ============================================
-- 3. Menu Items table (with image_url column)
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_veg TINYINT DEFAULT 1,
  is_available TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Helper: store category IDs (safe for fresh install)
SET @coffee_id = (SELECT id FROM categories WHERE name = 'Coffee');
SET @burger_id = (SELECT id FROM categories WHERE name = 'Burger');
SET @milkshake_id = (SELECT id FROM categories WHERE name = 'Milk Shake');
SET @mojito_id = (SELECT id FROM categories WHERE name = 'Mojito');
SET @sandwich_id = (SELECT id FROM categories WHERE name = 'Sandwich');
SET @fries_id = (SELECT id FROM categories WHERE name = 'Fries');
SET @pizza_id = (SELECT id FROM categories WHERE name = 'Pizza');
SET @maggi_id = (SELECT id FROM categories WHERE name = 'Maggi');

-- Insert menu items (all vegetarian, all available)
INSERT INTO menu_items (category_id, name, description, price, is_veg, is_available, image_url) VALUES
(@coffee_id, 'Cold Coffee', 'Chilled coffee drink', 80, 1, 1, NULL),
(@coffee_id, 'Cold Coffee with Ice Cream', 'Cold coffee topped with vanilla ice cream', 90, 1, 1, NULL),
(@coffee_id, 'Chocolate Cold Coffee', 'Rich chocolate cold coffee', 90, 1, 1, NULL),

(@burger_id, 'Veg Burger', 'Crispy veg patty burger', 40, 1, 1, NULL),
(@burger_id, 'Cheese Burger', 'Veg burger with cheese slice', 50, 1, 1, NULL),
(@burger_id, 'Paneer Burger', 'Grilled paneer patty burger', 70, 1, 1, NULL),

(@milkshake_id, 'Chocolate Milk Shake', 'Creamy chocolate milkshake', 70, 1, 1, NULL),
(@milkshake_id, 'Mango Milk Shake', 'Fresh mango milkshake', 80, 1, 1, NULL),
(@milkshake_id, 'Strawberry Milk Shake', 'Sweet strawberry milkshake', 80, 1, 1, NULL),
(@milkshake_id, 'KitKat Milk Shake', 'KitKat crushed milkshake', 90, 1, 1, NULL),
(@milkshake_id, 'Oreo Milk Shake', 'Oreo cookie milkshake', 90, 1, 1, NULL),

(@mojito_id, 'Mint Mojito', 'Refreshing mint mojito', 70, 1, 1, NULL),
(@mojito_id, 'Lemon Mojito', 'Tangy lemon mojito', 70, 1, 1, NULL),
(@mojito_id, 'Blue Mojito', 'Blue curacao mojito', 80, 1, 1, NULL),
(@mojito_id, 'Orange Mojito', 'Citrus orange mojito', 80, 1, 1, NULL),

(@sandwich_id, 'Veg Sandwich', 'Grilled vegetable sandwich', 60, 1, 1, NULL),
(@sandwich_id, 'Cheese Sandwich', 'Cheese toasted sandwich', 70, 1, 1, NULL),
(@sandwich_id, 'Chocolate Sandwich', 'Sweet chocolate sandwich', 80, 1, 1, NULL),
(@sandwich_id, 'Paneer Sandwich', 'Grilled paneer sandwich', 90, 1, 1, NULL),

(@fries_id, 'French Fries', 'Classic salted fries', 60, 1, 1, NULL),
(@fries_id, 'Peri Peri Fries', 'Spicy peri peri fries', 70, 1, 1, NULL),
(@fries_id, 'Masala Fries', 'Indian masala fries', 70, 1, 1, NULL),
(@fries_id, 'Cheese Fries', 'Fries topped with cheese sauce', 80, 1, 1, NULL),

(@pizza_id, 'Margherita Pizza', 'Classic cheese and tomato pizza', 100, 1, 1, NULL),
(@pizza_id, 'Veg Pizza', 'Mixed vegetable pizza', 120, 1, 1, NULL),
(@pizza_id, 'Corn Pizza', 'Sweet corn pizza', 130, 1, 1, NULL),
(@pizza_id, 'Sweet Corn Pizza', 'Extra sweet corn pizza', 140, 1, 1, NULL),
(@pizza_id, 'Paneer Pizza', 'Cottage cheese pizza', 150, 1, 1, NULL),
(@pizza_id, 'White House Special Pizza', 'Signature pizza with special toppings', 200, 1, 1, NULL),

(@maggi_id, 'Plain Maggi', 'Classic plain maggi noodles', 50, 1, 1, NULL),
(@maggi_id, 'Veg Maggi', 'Maggi with mixed vegetables', 60, 1, 1, NULL),
(@maggi_id, 'Cheese Maggi', 'Cheesy maggi noodles', 70, 1, 1, NULL),
(@maggi_id, 'Paneer Maggi', 'Maggi with paneer cubes', 80, 1, 1, NULL);

-- ============================================
-- 4. Tables & Seats (unchanged)
-- ============================================
CREATE TABLE IF NOT EXISTS tables_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  table_type ENUM('table','sofa') DEFAULT 'table',
  capacity INT DEFAULT 4,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tables_seats (table_number, table_type, capacity) VALUES
('T1','table',4), ('T2','table',4), ('T3','table',6),
('T4','table',2), ('T5','table',4),
('S1','sofa',4), ('S2','sofa',6), ('S3','sofa',4);

-- ============================================
-- 5. Orders table (unchanged)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  table_id INT,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','confirmed','preparing','served','cancelled') DEFAULT 'pending',
  notes TEXT,
  sms_sent TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables_seats(id) ON DELETE SET NULL
);

-- ============================================
-- End of schema
-- ============================================
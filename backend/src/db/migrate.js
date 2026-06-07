require('dotenv').config();
const pool = require('./pool');

const migration = `
-- Enum types
CREATE TYPE user_role AS ENUM ('pharmacy', 'distributor', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled');

-- Users table (shared for all roles)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status DEFAULT 'pending',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pharmacy profiles
CREATE TABLE IF NOT EXISTS pharmacies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  license_file_url VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  inn VARCHAR(20),
  contact_person VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Distributor profiles
CREATE TABLE IF NOT EXISTS distributors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  license_file_url VARCHAR(500),
  certificate_file_url VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  inn VARCHAR(20),
  contact_person VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Drug catalog (Etalon - reference database from government registry)
CREATE TABLE IF NOT EXISTS drugs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  name_latin VARCHAR(500),
  generic_name VARCHAR(500),
  manufacturer VARCHAR(255),
  country VARCHAR(100),
  dosage VARCHAR(100),
  form VARCHAR(100),
  barcode VARCHAR(50),
  mxik_code VARCHAR(50),
  atc_code VARCHAR(20),
  prescription_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Distributor drug prices (inventory)
CREATE TABLE IF NOT EXISTS distributor_drugs (
  id SERIAL PRIMARY KEY,
  distributor_id INTEGER REFERENCES distributors(id) ON DELETE CASCADE,
  drug_id INTEGER REFERENCES drugs(id) ON DELETE CASCADE,
  price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  min_order_qty INTEGER DEFAULT 1,
  expiry_date DATE,
  batch_number VARCHAR(100),
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(distributor_id, drug_id, batch_number)
);

-- Shopping cart
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
  distributor_drug_id INTEGER REFERENCES distributor_drugs(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pharmacy_id, distributor_drug_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
  distributor_id INTEGER REFERENCES distributors(id) ON DELETE CASCADE,
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(14, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  drug_id INTEGER REFERENCES drugs(id),
  drug_name VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(14, 2) NOT NULL
);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  comment TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Promotions / Discounts from distributors
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  distributor_id INTEGER REFERENCES distributors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_percent DECIMAL(5, 2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_drugs_barcode ON drugs(barcode);
CREATE INDEX idx_drugs_mxik ON drugs(mxik_code);
CREATE INDEX idx_drugs_name ON drugs(name);
CREATE INDEX idx_drugs_name_trgm ON drugs USING gin(name gin_trgm_ops);
CREATE INDEX idx_distributor_drugs_drug ON distributor_drugs(drug_id);
CREATE INDEX idx_distributor_drugs_distributor ON distributor_drugs(distributor_id);
CREATE INDEX idx_distributor_drugs_price ON distributor_drugs(price);
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_orders_distributor ON orders(distributor_id);
CREATE INDEX idx_orders_status ON orders(status);
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    // Enable trigram extension for fuzzy search
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await client.query(migration);
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

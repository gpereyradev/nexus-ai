CREATE TABLE users (
    id UUID PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE categories ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX ux_categories_name_ci ON categories(lower(name));
CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    cost DECIMAL(12,2) NOT NULL CHECK (cost >= 0),
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_products_category ON products(category_id);
CREATE INDEX ix_products_name ON products(lower(name));
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(254),
    phone VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_customers_name ON customers(lower(name));

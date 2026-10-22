CREATE SEQUENCE sale_code_seq;
CREATE TABLE sales (
    id UUID PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(160),
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    status VARCHAR(12) NOT NULL CHECK (status IN ('CONFIRMED','CANCELLED')),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    request_key UUID NOT NULL,
    request_hash CHAR(64) NOT NULL,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason VARCHAR(250),
    UNIQUE(created_by, request_key),
    CHECK ((status='CONFIRMED' AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
        OR (status='CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason))>0))
);
CREATE INDEX ix_sales_occurred ON sales(occurred_at DESC, id);
CREATE INDEX ix_sales_customer ON sales(customer_id);
CREATE TABLE sales_items (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id),
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(40) NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal = quantity * unit_price),
    UNIQUE(sale_id, product_id)
);
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    type VARCHAR(12) NOT NULL CHECK (type IN ('ENTRY','ADJUSTMENT','SALE','REVERSAL')),
    quantity INTEGER NOT NULL CHECK (quantity <> 0),
    stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
    stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
    reason VARCHAR(250) NOT NULL CHECK (length(trim(reason)) > 0),
    sale_id UUID REFERENCES sales(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_key UUID,
    CHECK (stock_after::BIGINT = stock_before::BIGINT + quantity::BIGINT),
    CHECK ((type IN ('ENTRY','REVERSAL') AND quantity>0) OR (type='SALE' AND quantity<0) OR type='ADJUSTMENT'),
    CHECK ((type IN ('SALE','REVERSAL') AND sale_id IS NOT NULL AND request_key IS NULL)
        OR (type IN ('ENTRY','ADJUSTMENT') AND sale_id IS NULL AND request_key IS NOT NULL)),
    UNIQUE(sale_id, product_id, type),
    UNIQUE(created_by, request_key)
);
CREATE INDEX ix_movements_product ON stock_movements(product_id,created_at DESC);
CREATE INDEX ix_movements_created ON stock_movements(created_at DESC,id);
CREATE FUNCTION validate_movement_balance() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
DECLARE current_balance BIGINT;
BEGIN
    PERFORM 1 FROM products WHERE id=NEW.product_id FOR UPDATE;
    SELECT COALESCE(SUM(quantity),0) INTO current_balance FROM stock_movements WHERE product_id=NEW.product_id;
    IF NEW.stock_before::BIGINT <> current_balance OR current_balance + NEW.quantity::BIGINT <> NEW.stock_after::BIGINT THEN
        RAISE EXCEPTION 'Movement does not match the ledger balance' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_stock_balance BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION validate_movement_balance();
CREATE VIEW inventory_balances AS
SELECT p.id,p.sku,p.name,p.category_id,p.price,p.min_stock,p.active,
    COALESCE(SUM(m.quantity),0)::BIGINT AS stock
FROM products p LEFT JOIN stock_movements m ON m.product_id=p.id GROUP BY p.id;

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Historical records are immutable' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER immutable_stock_movements BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_sales_items BEFORE UPDATE OR DELETE ON sales_items
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TABLE demo_seed_runs (code VARCHAR(40) PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

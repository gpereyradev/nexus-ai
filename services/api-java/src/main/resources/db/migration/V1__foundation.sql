-- F0: cimientos mínimos. Usuarios y catálogos completos se añaden en F1.
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(120) NOT NULL,
    CONSTRAINT ck_roles_code CHECK (code IN ('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'))
);
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

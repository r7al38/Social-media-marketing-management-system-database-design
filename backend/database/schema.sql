-- ============================================================
--  Social Media Marketing Management System
--  Database Schema — SQLite
--  Version: 1.0.0
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA encoding = 'UTF-8';

-- ============================================================
-- TABLE: users
-- Admin accounts with role-based access control
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    username     TEXT     NOT NULL UNIQUE COLLATE NOCASE,
    password     TEXT     NOT NULL,                        -- bcrypt hash
    role         TEXT     NOT NULL DEFAULT 'staff'
                          CHECK(role IN ('admin', 'staff', 'viewer')),
    is_active    INTEGER  NOT NULL DEFAULT 1
                          CHECK(is_active IN (0, 1)),
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: clients
-- Core client profiles — cafes, restaurants, small businesses
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    business_name TEXT     NOT NULL,
    type          TEXT     NOT NULL
                           CHECK(type IN ('cafe', 'restaurant', 'company', 'other')),
    phone         TEXT,
    email         TEXT     UNIQUE COLLATE NOCASE,
    address       TEXT,
    notes         TEXT,
    is_active     INTEGER  NOT NULL DEFAULT 1
                           CHECK(is_active IN (0, 1)),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: services
-- Service catalog — all offerings available to clients
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    service_name TEXT     NOT NULL,
    category     TEXT     NOT NULL
                          CHECK(category IN ('ads', 'growth', 'security', 'management')),
    description  TEXT,
    price        REAL     NOT NULL DEFAULT 0 CHECK(price >= 0),
    is_active    INTEGER  NOT NULL DEFAULT 1
                          CHECK(is_active IN (0, 1)),
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: client_services
-- M:M bridge — which clients subscribe to which services
-- ============================================================
CREATE TABLE IF NOT EXISTS client_services (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    client_id  INTEGER  NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
    service_id INTEGER  NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    start_date DATE,
    end_date   DATE,
    status     TEXT     NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active', 'paused', 'cancelled')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, service_id)
);

-- ============================================================
-- TABLE: social_accounts
-- Social media credentials linked to a client (encrypted at rest)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_accounts (
    id                 INTEGER  PRIMARY KEY AUTOINCREMENT,
    client_id          INTEGER  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform           TEXT     NOT NULL
                                CHECK(platform IN (
                                    'Facebook','Instagram','TikTok',
                                    'Twitter','YouTube','Snapchat'
                                )),
    username           TEXT     NOT NULL,
    password_encrypted TEXT,                               -- AES-256 encrypted
    recovery_email     TEXT,
    notes              TEXT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: orders
-- Individual service orders placed by clients
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER  PRIMARY KEY AUTOINCREMENT,
    client_id           INTEGER  NOT NULL REFERENCES clients(id)  ON DELETE RESTRICT,
    service_id          INTEGER  NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    quantity            INTEGER  NOT NULL DEFAULT 1 CHECK(quantity > 0),
    unit_price          REAL     NOT NULL CHECK(unit_price >= 0),
    total_price         REAL     NOT NULL CHECK(total_price >= 0),
    status              TEXT     NOT NULL DEFAULT 'pending'
                                 CHECK(status IN ('pending','in_progress','completed','cancelled')),
    progress_percentage INTEGER  NOT NULL DEFAULT 0
                                 CHECK(progress_percentage BETWEEN 0 AND 100),
    notes               TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME
);

-- ============================================================
-- TABLE: invoices
-- Invoice headers — one invoice can cover multiple orders
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id             INTEGER  PRIMARY KEY AUTOINCREMENT,
    client_id      INTEGER  NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number TEXT     NOT NULL UNIQUE,               -- e.g. INV-2024-0001
    total_amount   REAL     NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
    status         TEXT     NOT NULL DEFAULT 'unpaid'
                            CHECK(status IN ('paid','unpaid','overdue','cancelled')),
    due_date       DATE,
    notes          TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at        DATETIME
);

-- ============================================================
-- TABLE: invoice_items
-- Line items within an invoice — linked to specific orders
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    invoice_id  INTEGER  NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_id    INTEGER           REFERENCES orders(id)   ON DELETE SET NULL,
    description TEXT     NOT NULL,
    quantity    INTEGER  NOT NULL DEFAULT 1 CHECK(quantity > 0),
    unit_price  REAL     NOT NULL CHECK(unit_price >= 0),
    subtotal    REAL     NOT NULL CHECK(subtotal >= 0)
);

-- ============================================================
-- TABLE: tasks
-- Tasks assigned to clients and managed by staff
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assigned_to INTEGER           REFERENCES users(id)   ON DELETE SET NULL,
    title       TEXT     NOT NULL,
    description TEXT,
    status      TEXT     NOT NULL DEFAULT 'todo'
                         CHECK(status IN ('todo','in_progress','done')),
    deadline    DATETIME,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: activity_log
-- Audit trail for all system actions
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER           REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT     NOT NULL,                         -- e.g. 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT     NOT NULL,                         -- e.g. 'client', 'order', 'invoice'
    entity_id   INTEGER,
    details     TEXT,                                      -- JSON blob with before/after values
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES — optimised for common queries
-- ============================================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_type       ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_email      ON clients(email);

-- Social accounts
CREATE INDEX IF NOT EXISTS idx_social_client      ON social_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_social_platform    ON social_accounts(platform);

-- Client services
CREATE INDEX IF NOT EXISTS idx_cs_client          ON client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_service         ON client_services(service_id);
CREATE INDEX IF NOT EXISTS idx_cs_status          ON client_services(status);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_client      ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_service     ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders(created_at);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client    ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_inv_items_invoice  ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_order    ON invoice_items(order_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_client       ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned     ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline     ON tasks(deadline);

-- Activity log
CREATE INDEX IF NOT EXISTS idx_log_user           ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_log_entity         ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_log_created_at     ON activity_log(created_at);

-- ============================================================
-- TRIGGERS — auto-maintain updated_at and invoice totals
-- ============================================================

-- Auto-update tasks.updated_at on change
CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Auto-update invoices.total_amount when items change (insert)
CREATE TRIGGER IF NOT EXISTS trg_invoice_total_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM invoice_items
        WHERE invoice_id = NEW.invoice_id
    )
    WHERE id = NEW.invoice_id;
END;

-- Auto-update invoices.total_amount when items change (update)
CREATE TRIGGER IF NOT EXISTS trg_invoice_total_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM invoice_items
        WHERE invoice_id = NEW.invoice_id
    )
    WHERE id = NEW.invoice_id;
END;

-- Auto-update invoices.total_amount when items change (delete)
CREATE TRIGGER IF NOT EXISTS trg_invoice_total_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM invoice_items
        WHERE invoice_id = OLD.invoice_id
    )
    WHERE id = OLD.invoice_id;
END;

-- ============================================================
-- SEED DATA — default admin user (password: Admin@1234)
-- Replace hash with your own bcrypt hash before production use
-- ============================================================
INSERT OR IGNORE INTO users (username, password, role)
VALUES (
    'admin',
    '$2b$12$K5j1mQqUQ8.eWXa1FHkPOuLvP6NiG2hbZX3fYyR4lGt7pJmVwCsKu',
    'admin'
);

-- Sample service catalog
INSERT OR IGNORE INTO services (service_name, category, description, price) VALUES
    ('Instagram Growth Package',   'growth',     'Organic follower growth via targeted engagement', 150.00),
    ('Facebook Ads Campaign',      'ads',        'Full ad setup, targeting, and monthly reporting', 300.00),
    ('TikTok Content Management',  'management', 'Weekly content scheduling and analytics',          200.00),
    ('Account Recovery Service',   'security',   'Recovery of hacked or locked social accounts',    250.00),
    ('Monthly Social Management',  'management', 'Full management of 2 platforms, daily posts',     400.00);

-- Migration: Create Materialized View for Supplier Balances
-- Description: Aggregates orders and payments for real-time (v2) financial status

DROP MATERIALIZED VIEW IF EXISTS supplier_balances_view;

CREATE MATERIALIZED VIEW supplier_balances_view AS
WITH order_stats AS (
    SELECT 
        supplier_id,
        COUNT(id) as order_count,
        SUM(total_amount) as total_purchases,
        MAX(order_date) as last_order_date
    FROM supplier_orders_v2
    WHERE status != 'cancelled' AND deleted_at IS NULL
    GROUP BY supplier_id
),
payment_stats AS (
    SELECT 
        supplier_id,
        COUNT(id) as payment_count,
        SUM(amount) as total_paid,
        MAX(payment_date) as last_payment_date
    FROM supplier_payments_v2
    WHERE deleted_at IS NULL
    GROUP BY supplier_id
)
SELECT 
    s.id,
    s.name,
    COALESCE(os.order_count, 0) as order_count,
    COALESCE(os.total_purchases, 0) as total_purchases,
    os.last_order_date,
    COALESCE(ps.payment_count, 0) as payment_count,
    COALESCE(ps.total_paid, 0) as total_paid,
    ps.last_payment_date,
    (COALESCE(os.total_purchases, 0) - COALESCE(ps.total_paid, 0)) as current_balance
FROM suppliers_v2 s
LEFT JOIN order_stats os ON s.id = os.supplier_id
LEFT JOIN payment_stats ps ON s.id = ps.supplier_id
WHERE s.deleted_at IS NULL;

-- 1. Unique Index on ID (required for concurrent refresh)
CREATE UNIQUE INDEX idx_supplier_balances_id ON supplier_balances_view (id);

-- 2. Performance Indexes
CREATE INDEX idx_supplier_balances_balance ON supplier_balances_view (current_balance);
CREATE INDEX idx_supplier_balances_name ON supplier_balances_view (name);

-- Note: To refresh this view, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_balances_view;

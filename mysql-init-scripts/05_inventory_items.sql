-- Migration: introduce inventory_items as canonical inbound/stock unit
-- 1) create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_item_id INT NOT NULL AUTO_INCREMENT,
    inventory_code VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    status ENUM('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (inventory_item_id),
    UNIQUE KEY uk_inventory_items_code (inventory_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) add nullable columns to allow backfill
ALTER TABLE product ADD COLUMN IF NOT EXISTS inventory_item_id INT NULL;
ALTER TABLE master_product ADD COLUMN IF NOT EXISTS inventory_item_id INT NULL;
ALTER TABLE store_type_price ADD COLUMN IF NOT EXISTS inventory_item_id INT NULL;
ALTER TABLE master_stock ADD COLUMN IF NOT EXISTS inventory_item_id INT NULL;
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS inventory_item_id INT NULL;

-- prepare indexes for inventory-first operations
ALTER TABLE master_stock ADD INDEX idx_master_stock_inventory (inventory_item_id);
ALTER TABLE stock_transaction ADD INDEX idx_stock_txn_inventory (inventory_item_id);

-- 3) seed inventory_items grouped by product name (default sharing rule)
INSERT INTO inventory_items (inventory_code, name, status)
SELECT MIN(p.code) AS inventory_code, p.name, 'ACTIVE'
FROM product p
GROUP BY p.name
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 4) backfill product.inventory_item_id based on name grouping
UPDATE product p
JOIN inventory_items ii ON ii.name = p.name
SET p.inventory_item_id = ii.inventory_item_id
WHERE p.inventory_item_id IS NULL;

-- 5) backfill master_product.inventory_item_id via product_variant -> product
UPDATE master_product mp
JOIN product_variant pv ON pv.master_product_id = mp.master_product_id
JOIN product p ON p.product_id = pv.variant_id
SET mp.inventory_item_id = p.inventory_item_id
WHERE mp.inventory_item_id IS NULL;

-- 6) backfill cost/stock/transaction tables using master_product mapping
UPDATE store_type_price stp
JOIN master_product mp ON mp.master_product_id = stp.master_product_id
SET stp.inventory_item_id = mp.inventory_item_id
WHERE stp.inventory_item_id IS NULL;

UPDATE master_stock ms
JOIN master_product mp ON mp.master_product_id = ms.master_product_id
SET ms.inventory_item_id = mp.inventory_item_id
WHERE ms.inventory_item_id IS NULL;

UPDATE stock_transaction stx
LEFT JOIN product_variant pv ON pv.variant_id = stx.variant_id
LEFT JOIN product p ON p.product_id = pv.variant_id
LEFT JOIN master_product mp ON mp.master_product_id = stx.master_product_id
SET stx.inventory_item_id = COALESCE(p.inventory_item_id, mp.inventory_item_id)
WHERE stx.inventory_item_id IS NULL;

-- 7) enforce not-null once filled
ALTER TABLE product MODIFY inventory_item_id INT NOT NULL;
ALTER TABLE master_product MODIFY inventory_item_id INT NULL;
ALTER TABLE store_type_price MODIFY inventory_item_id INT NULL;
ALTER TABLE master_stock MODIFY inventory_item_id INT NOT NULL;
ALTER TABLE stock_transaction MODIFY inventory_item_id INT NULL;

ALTER TABLE master_stock DROP PRIMARY KEY,
    ADD PRIMARY KEY (inventory_item_id, store_id),
    ADD KEY idx_master_stock_master (master_product_id);
ALTER TABLE store_type_price DROP INDEX uk_store_type_price,
    ADD UNIQUE KEY uk_store_type_price (inventory_item_id, store_type);

-- 8) add foreign keys
ALTER TABLE product
    ADD CONSTRAINT fk_product_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id);
ALTER TABLE master_product
    ADD CONSTRAINT fk_master_product_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id);
ALTER TABLE store_type_price
    ADD CONSTRAINT fk_store_type_price_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id);
ALTER TABLE master_stock
    ADD CONSTRAINT fk_master_stock_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id);
ALTER TABLE stock_transaction
    ADD CONSTRAINT fk_stock_txn_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (inventory_item_id);

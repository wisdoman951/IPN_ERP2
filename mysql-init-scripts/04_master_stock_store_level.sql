-- -----------------------------------------------------
-- Migration: split master_stock by store_id
-- -----------------------------------------------------
START TRANSACTION;

-- 1. Add store_id column so every master stock row can be tied to a branch
ALTER TABLE master_stock
    ADD COLUMN store_id INT NULL AFTER master_product_id;

-- 2. Backfill existing rows to HQ (總店/總部) or the lowest store_id as fallback
SET @fallback_store_id = (
    SELECT store_id FROM store
    WHERE store_name IN ('總店','總部')
    ORDER BY store_id DESC
    LIMIT 1
);
SET @fallback_store_id = COALESCE(@fallback_store_id, (SELECT MIN(store_id) FROM store));
UPDATE master_stock
SET store_id = COALESCE(store_id, @fallback_store_id)
WHERE store_id IS NULL;

-- 3. Enforce NOT NULL + composite primary key
ALTER TABLE master_stock
    MODIFY store_id INT NOT NULL;
ALTER TABLE master_stock
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (master_product_id, store_id);

-- 4. Add foreign key + index for store references
ALTER TABLE master_stock
    ADD KEY idx_master_stock_store (store_id);
ALTER TABLE master_stock
    ADD CONSTRAINT fk_master_stock_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE CASCADE;

COMMIT;

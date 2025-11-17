-- -----------------------------------------------------
-- Data migration for master_product / product_variant / master_stock tables
-- -----------------------------------------------------
START TRANSACTION;

-- 1. Normalize store_type so that桃園門市或 store_id = 5 視為加盟店，其餘預設為直營
UPDATE store
SET store_type = CASE
    WHEN store_id = 5 OR store_name LIKE '%桃園%' THEN 'FRANCHISE'
    ELSE 'DIRECT'
END
WHERE store_type IS NULL OR store_type NOT IN ('DIRECT','FRANCHISE');

-- 2. 建立 master_product 基礎資料
WITH normalized AS (
    SELECT
        p.product_id,
        p.code,
        p.name,
        p.price,
        p.purchase_price,
        p.status,
        UPPER(SUBSTRING(p.code, 1, 5)) AS master_code,
        NULLIF(TRIM(BOTH '-' FROM SUBSTRING_INDEX(p.name, '-', 1)), '') AS base_name
    FROM product p
)
INSERT INTO master_product (master_product_code, name, status)
SELECT
    n.master_code,
    COALESCE(MAX(base_name), MAX(n.name)) AS display_name,
    CASE WHEN SUM(n.status = 'PUBLISHED') > 0 THEN 'ACTIVE' ELSE 'INACTIVE' END AS status
FROM normalized n
GROUP BY n.master_code
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    status = VALUES(status);

-- 3. 依既有產品建立 product_variant 映射（沿用 product_id 當 variant_id）
INSERT INTO product_variant (variant_id, master_product_id, variant_code, display_name, sale_price, status)
SELECT
    p.product_id,
    mp.master_product_id,
    p.code,
    p.name,
    p.price,
    CASE WHEN p.status = 'PUBLISHED' THEN 'ACTIVE' ELSE 'INACTIVE' END
FROM product p
JOIN master_product mp ON mp.master_product_code = UPPER(SUBSTRING(p.code, 1, 5))
ON DUPLICATE KEY UPDATE
    master_product_id = VALUES(master_product_id),
    variant_code = VALUES(variant_code),
    display_name = VALUES(display_name),
    sale_price = VALUES(sale_price),
    status = VALUES(status);

-- 4. 針對不同店型建立成本價（暫以現有 purchase_price 做為兩種店型共同成本）
INSERT INTO store_type_price (master_product_id, store_type, cost_price)
SELECT
    mp.master_product_id,
    st.store_type,
    COALESCE(MAX(CASE WHEN p.purchase_price IS NOT NULL THEN p.purchase_price END), 0)
FROM master_product mp
JOIN product_variant pv ON pv.master_product_id = mp.master_product_id
JOIN product p ON p.product_id = pv.variant_id
JOIN (SELECT 'DIRECT' AS store_type UNION ALL SELECT 'FRANCHISE') st
GROUP BY mp.master_product_id, st.store_type
ON DUPLICATE KEY UPDATE
    cost_price = VALUES(cost_price);

SET @fallback_store_id = (
    SELECT store_id FROM store
    WHERE store_name IN ('總店','總部')
    ORDER BY store_id DESC
    LIMIT 1
);
SET @fallback_store_id = COALESCE(@fallback_store_id, (SELECT MIN(store_id) FROM store));

INSERT INTO master_stock (master_product_id, store_id, quantity_on_hand, updated_at)
SELECT
    mp.master_product_id,
    COALESCE(inv.store_id, @fallback_store_id) AS store_id,
    COALESCE(SUM(inv.quantity), 0) AS quantity_on_hand,
    NOW()
FROM master_product mp
LEFT JOIN product_variant pv ON pv.master_product_id = mp.master_product_id
LEFT JOIN inventory inv ON inv.product_id = pv.variant_id
GROUP BY mp.master_product_id, COALESCE(inv.store_id, @fallback_store_id)
ON DUPLICATE KEY UPDATE
    quantity_on_hand = VALUES(quantity_on_hand),
    updated_at = VALUES(updated_at);

COMMIT;

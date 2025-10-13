-- General member bundle definitions with standard selling prices
INSERT INTO product_bundles (bundle_code, name, calculated_price, selling_price, created_at, visible_store_ids)
VALUES
  ('PCP0000', '7+7天淨化套組', NULL, 14730.00, NULL, NULL),
  ('PCP0503', '有機彩虹藜麥-3罐', NULL, 1100.00, NULL, NULL),
  ('PCP0605', '芝麻醬-3罐', NULL, 1200.00, NULL, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  calculated_price = VALUES(calculated_price),
  selling_price = VALUES(selling_price),
  created_at = VALUES(created_at),
  visible_store_ids = VALUES(visible_store_ids);

-- Bundle item mappings for the general member bundles
INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
SELECT b.bundle_id, p.product_id, 'Product', 1
FROM product_bundles b
JOIN product p ON p.code = 'PCP0303'
WHERE b.bundle_code = 'PCP0000'
  AND NOT EXISTS (
    SELECT 1
    FROM product_bundle_items i
    WHERE i.bundle_id = b.bundle_id
      AND i.item_id = p.product_id
  );

INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
SELECT b.bundle_id, p.product_id, 'Product', 1
FROM product_bundles b
JOIN product p ON p.code = 'PSO0109'
WHERE b.bundle_code = 'PCP0000'
  AND NOT EXISTS (
    SELECT 1
    FROM product_bundle_items i
    WHERE i.bundle_id = b.bundle_id
      AND i.item_id = p.product_id
  );

INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
SELECT b.bundle_id, p.product_id, 'Product', 3
FROM product_bundles b
JOIN product p ON p.code = 'PCP0501'
WHERE b.bundle_code = 'PCP0503'
  AND NOT EXISTS (
    SELECT 1
    FROM product_bundle_items i
    WHERE i.bundle_id = b.bundle_id
      AND i.item_id = p.product_id
  );

INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
SELECT b.bundle_id, p.product_id, 'Product', 3
FROM product_bundles b
JOIN product p ON p.code = 'PCP0603'
WHERE b.bundle_code = 'PCP0605'
  AND NOT EXISTS (
    SELECT 1
    FROM product_bundle_items i
    WHERE i.bundle_id = b.bundle_id
      AND i.item_id = p.product_id
  );

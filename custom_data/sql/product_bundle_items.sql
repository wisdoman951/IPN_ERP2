INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
SELECT pb.bundle_id,
       p.product_id,
       'Product',
       data.quantity
FROM (
    SELECT 'PCP0501' AS bundle_code, 'PCP0501' AS item_code, 3 AS quantity UNION ALL
    SELECT 'PCP0502', 'PCP0501', 3 UNION ALL
    SELECT 'PCP0503', 'PCP0501', 3 UNION ALL
    SELECT 'PCP0601', 'PCP0600', 3 UNION ALL
    SELECT 'PCP0602', 'PCP0604', 3 UNION ALL
    SELECT 'PCP0603', 'PCP0604', 3 UNION ALL
    SELECT 'PCP0604', 'PCP0604', 3 UNION ALL
    SELECT 'PCP0001', 'PSA10018', 4 UNION ALL
    SELECT 'PCP0001', 'PSB1009', 2 UNION ALL
    SELECT 'PCP0001', 'PCP0303', 1 UNION ALL
    SELECT 'PCP0001', 'PSO0109', 1 UNION ALL
    SELECT 'PCP0002', 'PSA1001', 3 UNION ALL
    SELECT 'PCP0002', 'PSB1001', 1 UNION ALL
    SELECT 'PCP0002', 'PCP0301', 1 UNION ALL
    SELECT 'PCP0003', 'PSA1001', 5 UNION ALL
    SELECT 'PCP0003', 'PSB1001', 2 UNION ALL
    SELECT 'PCP0003', 'PCP0301', 1 UNION ALL
    SELECT 'PCP0003', 'PCP0401', 1
) AS data
JOIN product_bundles pb ON pb.bundle_code = data.bundle_code
JOIN product p ON p.code = data.item_code
WHERE NOT EXISTS (
    SELECT 1
    FROM product_bundle_items pbi
    WHERE pbi.bundle_id = pb.bundle_id
      AND pbi.item_id = p.product_id
);

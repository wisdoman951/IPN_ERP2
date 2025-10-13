INSERT INTO product_bundle_price_tier (bundle_id, identity_type, price)
SELECT pb.bundle_id,
       data.identity_type,
       data.price
FROM (
    SELECT 'PCP0501' AS bundle_code, '直營店' AS identity_type, 1000.00 AS price UNION ALL
    SELECT 'PCP0601', '直營店', 800.00 UNION ALL
    SELECT 'PCP0502', '加盟店', 1050.00 UNION ALL
    SELECT 'PCP0602', '加盟店', 900.00 UNION ALL
    SELECT 'PCP0503', '合夥商', 1100.00 UNION ALL
    SELECT 'PCP0503', '推廣商(分店能量師)', 1100.00 UNION ALL
    SELECT 'PCP0503', 'B2B合作專案', 1100.00 UNION ALL
    SELECT 'PCP0503', '心耀商', 1100.00 UNION ALL
    SELECT 'PCP0503', '會員', 1100.00 UNION ALL
    SELECT 'PCP0603', '合夥商', 1000.00 UNION ALL
    SELECT 'PCP0603', '推廣商(分店能量師)', 1000.00 UNION ALL
    SELECT 'PCP0603', 'B2B合作專案', 1000.00 UNION ALL
    SELECT 'PCP0603', '心耀商', 1000.00 UNION ALL
    SELECT 'PCP0604', '會員', 1200.00 UNION ALL
    SELECT 'PCP0003', '合夥商', 10190.00 UNION ALL
    SELECT 'PCP0002', '推廣商(分店能量師)', 11290.00 UNION ALL
    SELECT 'PCP0002', 'B2B合作專案', 11290.00 UNION ALL
    SELECT 'PCP0002', '心耀商', 11290.00 UNION ALL
    SELECT 'PCP0001', '會員', 13260.00
) AS data
JOIN product_bundles pb ON pb.bundle_code = data.bundle_code
WHERE NOT EXISTS (
    SELECT 1
    FROM product_bundle_price_tier pt
    WHERE pt.bundle_id = pb.bundle_id
      AND pt.identity_type = data.identity_type
);

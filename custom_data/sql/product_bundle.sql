INSERT INTO product_bundles (bundle_code, name, calculated_price, selling_price)
SELECT data.bundle_code,
       data.name,
       data.calculated_price,
       NULL
FROM (
    SELECT 'PCP0001' AS bundle_code, '7+7天淨化套組' AS name, 14730.00 AS calculated_price UNION ALL
    SELECT 'PCP0002', '7天淨化套組', 12730.00 UNION ALL
    SELECT 'PCP0003', '14天淨化套組', 17220.00 UNION ALL
    SELECT 'PCP0501', '有機彩虹藜麥-3罐', 1000.00 UNION ALL
    SELECT 'PCP0502', '有機彩虹藜麥-3罐', 1050.00 UNION ALL
    SELECT 'PCP0503', '有機彩虹藜麥-3罐', 1100.00 UNION ALL
    SELECT 'PCP0601', '芝麻醬-3罐', 800.00 UNION ALL
    SELECT 'PCP0602', '芝麻醬-3罐', 900.00 UNION ALL
    SELECT 'PCP0603', '芝麻醬-3罐', 1000.00 UNION ALL
    SELECT 'PCP0604', '芝麻醬-3罐', 1200.00
) AS data
WHERE NOT EXISTS (
    SELECT 1
    FROM product_bundles pb
    WHERE pb.bundle_code = data.bundle_code
);

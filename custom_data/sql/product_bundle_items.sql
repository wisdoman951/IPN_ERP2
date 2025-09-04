INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity) VALUES
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0002'), (SELECT product_id FROM product WHERE code='PSA1001'), 'Product', 3),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0002'), (SELECT product_id FROM product WHERE code='PSB1001'), 'Product', 1),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0002'), (SELECT product_id FROM product WHERE code='PCP0301'), 'Product', 1),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0003'), (SELECT product_id FROM product WHERE code='PSA1001'), 'Product', 5),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0003'), (SELECT product_id FROM product WHERE code='PSB1001'), 'Product', 2),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0003'), (SELECT product_id FROM product WHERE code='PCP0301'), 'Product', 1),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0003'), (SELECT product_id FROM product WHERE code='PCP0401'), 'Product', 1),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0502'), (SELECT product_id FROM product WHERE code='PCP0501'), 'Product', 3),
((SELECT bundle_id FROM product_bundles WHERE bundle_code='PCP0503'), (SELECT product_id FROM product WHERE code='PCP0501'), 'Product', 3);

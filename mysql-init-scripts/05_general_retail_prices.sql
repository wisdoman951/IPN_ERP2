-- Data for general retail pricing updates
DROP TEMPORARY TABLE IF EXISTS tmp_general_retail_prices;
CREATE TEMPORARY TABLE tmp_general_retail_prices (
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL
);

INSERT INTO tmp_general_retail_prices (code, name, price) VALUES
('PSA1008','抺茶肽-單盒價',2050.00),
('PSA2008','洛神肽-單盒價',1700.00),
('PSB1009','複食好食-單盒價',1200.00),
('PSO0109','花暹子-單盒',800.00),
('PSO0110','花暹子-三盒-單盒',720.00),
('PSO0111','花暹子-六盒-單盒價',640.00),
('PSS0106','能量霜-單瓶價',1000.00),
('PCP0106','三合一(7小包)-單袋',3200.00),
('PCP0206','三合一(14小包)-單袋',6400.00),
('PCP0303','FTC-單瓶',3330.00),
('PCP0404','光之旅-單瓶價',980.00),
('PCP0504','有機彩虹藜麥-單罐',390.00),
('PCP0604','芝麻醬-單罐',450.00),
('SMA0104','乙太修復棒--每組',5000.00),
('SMA0204','VBH筋膜刀-每支',3000.00),
('SMA0304','動力鞋-每組',1600.00),
('SMA0404','量子握力棒-每組',600.00),
('SMA0504','MINI HPA能量帶(紫)-每條',500.00),
('SMA0605','MINI 紫色能量片-每組',650.00),
('SMA0702','MINI 紫色大貼片-每組',200.00),
('SMA0802','MINI 紫色小貼片-每組',150.00),
('SMA0902','MINI 眼部貼片-每組',170.00),
('SMA1002','MINI 主機-黑色攜行箱-每個',680.00),
('SMA1102','MINI 配件-黑色攜行箱-每個',500.00),
('SMA1202','MINI 操件手冊-每本',400.00),
('SMW0102','MINI QP 電源線-每組',450.00),
('SMW0202','MINI QP 正極線-每條',450.00),
('SMW0302','MINI QP 負極線-每條',450.00),
('SMW0402','MINI QP 正負極線-每條',450.00),
('SMW0502','MINI QP 針插線-每條',400.00),
('SMW0602','MINI QP 遙控單-每個',300.00),
('SHA0105','正負同源除濕棒-每支',2500.00),
('SHA0205','大金除濕棒-每支',2400.00),
('SHA0305','正負同源臉雕塑儀-每支',2300.00),
('SHA0405','小V臉雕塑儀-每支',2200.00),
('SHA0504','粉紅萬用能量片-每組',500.00),
('SHA0604','HPA能量帶(藍)-每條',500.00),
('SHA0705','長型能量片-每組',800.00),
('SHA0805','HPA 平面能量片-每組',650.00),
('SHA0904','手雷-每組',500.00),
('SHA1002','HPA 大白貼片-每組',200.00),
('SHA1102','HPA 小白貼片-每組',150.00),
('SHA1201','噴瓶-每支',150.00),
('SHA1402','40公分綁帶-每組',80.00),
('SHA1502','120公分綁帶-每條',120.00),
('SHA1600','後背包',599.00),
('SHA1701','儀器操作手冊-每本',500.00),
('SHW0102','HPA 一代一出四線-每條',350.00),
('SHW0202','HPA 一代正極線-每條',250.00),
('SHW0302','HPA 一代負極線-每條',250.00),
('SHW0402','HPA 一代針插線-每條',250.00),
('SHW0502','HPA 二代一出四線-每條',550.00),
('SHW0602','HPA 二代正極線-每條',450.00),
('SHW0702','HPA 二代負極線-每條',450.00),
('SHW0802','HPA 二代針插線-每條',400.00),
('SPO0101','IPN大毛巾-每條',120.00),
('SPO0201','IPN小毛巾-每條',40.00),
('SPO0301','面膜罩/熱敷巾-3條',220.00),
('SPO0401','IPN訂製床罩',500.00),
('SPO0501','不識布床巾-每捲',380.00),
('SPO0601','七脈輪巾-每條',350.00),
('SPO0701','叭叭巾-每條',420.00),
('SPO0801','面膜(濕)5片-每盒',480.00),
('SSO0101','IPN行李箱-每個',1000.00),
('SSO0201','全崴搖搖杯-每個',100.00),
('SSO0302','艾草除濕包-每包',210.00),
('SSO0401','脈輪皂-每個',480.00),
('SSO0500','IPN  Polo衫',550.00),
('SSO0600','IPN能量師灰色制服-每套',900.00),
('SSO0700','IPN調理服-每套',435.00),
('SSO0800','IPN圍裙',300.00),
('SCP0101','初級一階課程-系統',0.00),
('SCP0102','初級一階課程-自費',4600.00),
('SCP0103','初級一階課程-複訓',1000.00),
('SCP0201','初級二階課程-系統',0.00),
('SCP0202','初級二階課程-自費',4600.00),
('SCP0203','初級二階課程-複訓',1000.00),
('SCP0301','初級三階課程-系統',0.00),
('SCP0302','初級三階課程-自費',4600.00),
('SCP0303','初級三階課程-複訓',1000.00),
('SCP0401','初級四階課程-系統',0.00),
('SCP0402','初級四階課程-自費',4600.00),
('SCP0403','初級四階課程-複訓',1000.00);

-- 1) Insert products that do not yet exist, using the general retail price as the base price
INSERT INTO product (code, name, price, status)
SELECT t.code, t.name, t.price, 'PUBLISHED'
FROM tmp_general_retail_prices t
WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.code = t.code);

-- 2) Upsert the General Retail tier price for all listed products
INSERT INTO product_price_tier (product_id, identity_type, price)
SELECT p.product_id, '一般售價', t.price
FROM tmp_general_retail_prices t
JOIN product p ON p.code = t.code
ON DUPLICATE KEY UPDATE price = VALUES(price);

DROP TEMPORARY TABLE IF EXISTS tmp_general_retail_prices;

# Master product purchase price maintenance

`store_type_price` is the only table that controls what purchase cost appears on the “更新庫存資料 (進貨)” screen.  Each row ties a logical master product to one store type (直營 = `DIRECT`, 加盟 = `FRANCHISE`).

## Table columns
- `master_product_id` – references `master_product.master_product_id`.
- `store_type` – `DIRECT` or `FRANCHISE`.
- `cost_price` – decimal value that will be shown to users of that store type.
- `effective_date` – optional metadata (can be left NULL for now).

The `(master_product_id, store_type)` pair is unique, so you can upsert prices per store type.

## Finding the master product
Use the first five characters of the original product code (the migration stored them in `master_product.master_product_code`).  Example:
```sql
SELECT master_product_id, master_product_code, name
FROM master_product
WHERE master_product_code = 'PCP01';
```
`master_product_code` is what the inbound page now shows in the “產品編號” column of the summary view.

If you only know a variant code (e.g., `PCP0104`), resolve it through `product_variant`:
```sql
SELECT mp.master_product_id, mp.master_product_code, mp.name
FROM product_variant pv
JOIN master_product mp ON mp.master_product_id = pv.master_product_id
WHERE pv.variant_code = 'PCP0104';
```

## Setting or updating the purchase price
### Automatic seed data
The spreadsheets provided by IPN have already been encoded in
`mysql-init-scripts/04_store_type_price_seed.sql`.  Run it after the
initial migration to import or refresh the 直營 (`DIRECT`) and 加盟
(`FRANCHISE`) purchase prices:

```bash
mysql -u <user> -p <database> < mysql-init-scripts/04_store_type_price_seed.sql
```

Some products share一個 `master_product_code`（例如單盒與多盒包裝的
`PSO01*` 產品）；在這些情況我們取列表中的最高價，以確保進貨頁面預設
成本不會低估。

### Manual updates
Use an `INSERT ... ON DUPLICATE KEY UPDATE` so it works for both new and existing prices:
```sql
INSERT INTO store_type_price (master_product_id, store_type, cost_price)
VALUES (123, 'DIRECT', 2800.00)
ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price);

INSERT INTO store_type_price (master_product_id, store_type, cost_price)
VALUES (123, 'FRANCHISE', 3000.00)
ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price);
```
Replace `123` with the `master_product_id` you looked up.  Run once per store type whose price you want to control.

## Store type mapping
Current rule (see `03_master_product_migration.sql`):
- 桃園中三站 (store_id 5) → `FRANCHISE`.
- 台北、台中、澎湖、總部 → `DIRECT`.

When a user from 桃園登入時，他們會讀取 `store_type_price` 中 `store_type='FRANCHISE'` 的 `cost_price`。同樣地，直營店只會看到 `store_type='DIRECT'` 的價格。

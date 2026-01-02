# Inventory item migration

This release introduces `inventory_items` as the canonical unit for inbound purchases and stock. Each product now maps to an `inventory_item_id`, letting multiple product codes share the same inventory while allowing similarly prefixed items to stay independent.

## Run the migration
1. Ensure MySQL is backed up.
2. Apply `mysql-init-scripts/05_inventory_items.sql` to the database:
   ```bash
   mysql -u <user> -p <database> < mysql-init-scripts/05_inventory_items.sql
   ```
3. Restart application services so the new columns and indexes are picked up.

The script will:
- Create `inventory_items` and add `inventory_item_id` to related tables.
- Group existing products by `name` to seed `inventory_items` (shared stock for identical names).
- Backfill mappings and move `master_stock` to use `(inventory_item_id, store_id)` as its primary key.

## Verify shared vs. separated stock
Use these steps after running the migration:

### Case A – shared stock (e.g., SHA1500/1501/1502)
1. Confirm the three products share the same `inventory_item_id` (they do if their names match).
2. Call the inbound API with any one product code or `inventory_item_id` and quantity `+10`.
3. Query inventory for the other two codes; their available quantity should also reflect the `+10` increase because they map to the same inventory item.

### Case B – separated stock (e.g., PCP0701/0702/0703 oils)
1. Ensure each product has a distinct `inventory_item_id` (names differ, so the migration splits them).
2. Inbound `+10` using only PCP0701.
3. Check PCP0702 and PCP0703; their on-hand quantities should remain unchanged.

If you need to override the default name-based mapping, update `products.inventory_item_id` manually (or through the admin UI) and future stock movements will follow that assignment.

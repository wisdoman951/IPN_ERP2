# 會員身分別售價功能設計說明

## 1. 背景與目標
客戶希望針對不同身份別（直營店、加盟店、合夥商、推廣商 / 分店能量師、B2B合作專案、心耀商、會員、一般售價等）提供對應的產品、療程、產品組合與療程組合售價，同時保留目前 `product`、`therapy` 等主資料表的架構。新功能需支援：

- 為不同身份別定義獨立的售價、品號與顯示名稱。
- 對應多種可銷售項目：單一產品、療程、產品組合、療程組合。
- 可限制價目表僅在特定門市生效，或設定生效區間與優先順序。
- 系統在銷售時依據會員身份別、門市與目前日期自動挑選正確售價，若找不到對應價目則使用原始基礎定價作為保底。

## 2. 資料模型調整

### 2.1 新增與調整的表格
| 表格 | 說明 |
| --- | --- |
| `member_identity_type` | 身分類別主檔。使用英數 `identity_type_code` 作為主鍵，提供中文顯示名稱、優先順序、是否為預設值等欄位。`member.identity_type` 由原本 ENUM 改為外鍵參照此表。 |
| `member_price_book` | 以身份別為主的價目表。定義價目表名稱、適用身份別、作用範圍（商品 / 療程 / 組合 / 全部）、狀態、優先順序、生效起訖日等。 |
| `member_price_book_store` | 價目表與門市的關聯表，用來限制價目表僅在指定門市啟用。若無資料代表全門市適用。 |
| `member_price_book_item` | 單一價目條目。記錄對應項目（產品、療程、產品組合、療程組合）、售價、自訂品號/名稱、可選的數量區間與 JSON 格式的額外屬性（例如包裝數量）。 |
| `vw_member_product_prices`、`vw_member_therapy_prices` | 方便查詢的檢視表，將價目表資訊與原始產品 / 療程主檔整合。 |

### 2.2 主要欄位說明
- `member.identity_type`：改為 `varchar(32)`，預設值 `GENERAL_MEMBER`，並加上外鍵 `fk_member_identity_type`。
- `member_price_book.scope_type`：用來標示價目表適用的類型。若為 `ALL` 也可以混合放入不同 `item_type` 的條目。
- `member_price_book.priority`：同一身份別允許建立多個價目表時，系統會從數值最小者開始判斷是否符合（支援未來區域性活動或限時促銷）。
- `member_price_book_item.custom_code` / `custom_name`：儲存 Excel 中客戶提供的身份別專用品號與名稱。若為 `NULL` 則沿用原始項目名稱。
- `member_price_book_item.metadata`：保留包裝規格（例如「24盒裝 / 單盒價」）、促銷備註等彈性資訊，方便 API 直接回傳。
- `CHECK` 約束確保價格為非負、數量區間正確；外鍵確保資料一致性。

## 3. 資料載入與遷移建議
1. **建置身份別主檔**：於 `mysql-init-scripts/02_data.sql` 中加入所有身份別初始資料，可再視需求調整 `priority` 與 `is_default`。
2. **建置價目表**：先為每一身份別及品項類型建立至少一個 `member_price_book`。若 Excel 提供多個時段或區域價目，可拆分為多個價目表並設定 `valid_from` / `valid_to` 及 `member_price_book_store`。
3. **匯入價目條目**：使用 `scripts/import_member_pricebooks.py` 將 `會員別售價.xlsx` 轉換為 SQL 腳本並匯入資料庫。腳本會：
   - 依「直營店 → 加盟店 → 合夥商 → 推廣商 → B2B合作專案 → 心耀商 → 會員 → 一般售價」順序掃描各工作表，自動建立產品主檔並保留一般售價作為基礎售價。
   - 為每個身份別建立或更新 `member_price_book`，並清空原有條目後重新寫入 `member_price_book_item`。
   - 透過 `--valid-from` 參數設定價目表生效日期，並可加上 `--dump-json` 輸出檢查用的中介資料。
   - 使用方式範例：`python scripts/import_member_pricebooks.py custom_data/會員別售價.xlsx --output tmp/member_prices.sql --valid-from 2025-01-01`，再以 `mysql` 或 CI 流程執行產出的 SQL。
   - 若 Excel 內區分「單盒價 / 三盒 / 六盒」，將會以 `custom_code`、`custom_name` 原樣寫入，必要時可另外在 `metadata` JSON 欄位補充包裝資訊。
   - Excel 身份別 → `member_price_book.identity_type`
   - 產品 / 療程 / 組合代碼 → 先以既有 `product`、`therapy`、`product_bundles`、`therapy_bundles` 主檔查找 `id`
   - 身份別專屬品號 / 名稱 → 對應至 `custom_code`、`custom_name`
   - 售價 → 填入 `price`
   - 若 Excel 內區分「單盒價 / 三盒 / 六盒」，可利用 `metadata` JSON 或設定多筆條目與不同 `custom_code`
4. **維運流程**：
   - 新增或調整價目時，先建立新的 `member_price_book`（可先維持 `DRAFT` 狀態），填入條目後再切換為 `ACTIVE`。
   - 若需要暫停使用，可將 `status` 改為 `INACTIVE` 或設定 `valid_to`。
   - 若需多層 fallback，可利用 `priority` 與 `valid_from/valid_to` 控制。

## 4. 價格決策流程
以下為銷售流程查價時的建議邏輯：

```sql
SELECT mpi.*
FROM member_price_book mpb
JOIN member_price_book_item mpi ON mpb.price_book_id = mpi.price_book_id
LEFT JOIN member_price_book_store mpbs ON mpb.price_book_id = mpbs.price_book_id
WHERE mpb.identity_type = :member_identity
  AND mpi.item_type = :item_type
  AND mpi.item_id = :item_id
  AND mpb.status = 'ACTIVE'
  AND mpi.status = 'ACTIVE'
  AND (mpb.valid_from IS NULL OR mpb.valid_from <= CURRENT_DATE)
  AND (mpb.valid_to IS NULL OR mpb.valid_to >= CURRENT_DATE)
  AND (mpbs.store_id IS NULL OR mpbs.store_id = :store_id)
ORDER BY mpb.priority ASC, mpi.min_quantity DESC
LIMIT 1;
```

若查無資料則回退至原始 `product.price` / `therapy.price` / `product_bundles.selling_price` 等欄位。

## 5. API / 後台介面調整建議
- **後台管理頁面**：
  - 新增「身份別管理」頁簽，用於維護 `member_identity_type`（名稱、說明、優先序、是否啟用）。
  - 新增「價目表管理」頁面，支援建立 / 編輯價目表、分配門市、匯入 Excel（CSV）檔案產生條目、查詢價目歷史。
  - 在產品 / 療程 / 組合編輯頁面顯示已綁定的身份別售價清單，方便快速定位。
- **銷售流程**：於 `product_sell`、`therapy_sell` API 取品項時，根據會員身份別與門市套用上述查價邏輯，並回傳 `custom_code`、`custom_name` 供前端顯示或列印收據。
- **批量匯入工具**：提供指令列或後台上傳 Excel 功能，將客戶更新的價目表匯入至 `member_price_book_item`，並自動調整生效日期。

## 6. 未來擴充方向
- **版本控管 / 稽核**：可新增 `member_price_book_audit` 或利用事件表紀錄異動人員與時間。
- **通路折扣規則**：若未來需要依購買數量或促銷活動套用折扣，可擴充 `metadata` 或新增 `member_price_rule` 表格儲存公式。
- **與庫存 / 採購整合**：`custom_code` 可作為門市對外發票或採購單上的品號，確保報表與帳務一致。

## 7. 範例資料
`mysql-init-scripts/02_data.sql` 包含：
- 身份別主檔資料與示範價目表。
- `scripts/import_member_pricebooks.py` 可產生完整 SQL 用於量產資料，示範用資料可在測試或開發環境中先行驗證。
- 可透過 `vw_member_product_prices`、`vw_member_therapy_prices` 立即檢視結果，作為串接 API 或撰寫查詢的範例。

此設計可在不破壞既有產品 / 療程資料結構的情況下，支援客戶提出的身份別售價需求，並保留擴充空間以因應後續的促銷與版本管理需求。

-- ========================================
-- 清除舊有資料表（Drop Tables）
-- ========================================
-- Layer 3：Reference layer 2 table
DROP TABLE IF EXISTS `product_sell`;
DROP TABLE IF EXISTS `therapy_sell`;
DROP TABLE IF EXISTS `therapy_record`;
DROP TABLE IF EXISTS `ipn_pure`;

-- Layer 2：Reference layer 1 table
DROP TABLE IF EXISTS `inventory`;
DROP TABLE IF EXISTS `medical_record`;
DROP TABLE IF EXISTS `ipn_stress`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `usual_sympton_and_family_history`;

-- Layer 1：Base table
DROP TABLE IF EXISTS `member`;
DROP TABLE IF EXISTS `store`;
DROP TABLE IF EXISTS `micro_surgery`;
DROP TABLE IF EXISTS `product`;
DROP TABLE IF EXISTS `therapy`;
DROP TABLE IF EXISTS `family_information`;
DROP TABLE IF EXISTS `emergency_contact`;
DROP TABLE IF EXISTS `work_experience`;
DROP TABLE IF EXISTS `hiring_information`;

CREATE TABLE member (
  `member_id` INT NOT NULL AUTO_INCREMENT,
  `member_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `birthday` DATE NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other'),
  `blood_type` ENUM('A', 'B', 'AB', 'O'),
  `line_id` VARCHAR(50),
  `address` TEXT,
  `inferrer_id` INT,
  `phone` VARCHAR(20),
  `occupation` VARCHAR(100),
  `note` TEXT,
  PRIMARY KEY (`member_id`),
  FOREIGN KEY (`inferrer_id`) REFERENCES member(`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE store (
  `store_id` INT NOT NULL AUTO_INCREMENT,
  `account` VARCHAR(50) NOT NULL UNIQUE,
  `store_name` VARCHAR(100) NOT NULL,
  `store_location` VARCHAR(255),
  `password` VARCHAR(255) NOT NULL,
  `permission` VARCHAR(50) DEFAULT 'basic',
  PRIMARY KEY (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE micro_surgery (
  `micro_surgery_id` INT NOT NULL AUTO_INCREMENT,
  `micro_surgery_selection` TEXT,
  `micro_surgery_description` TEXT,
  PRIMARY KEY (`micro_surgery_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product (
  `product_id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE therapy (
    `therapy_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(255) UNIQUE,
    `name` VARCHAR(255),
    `price` DECIMAL(10, 2),
    `content` TEXT
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE family_information (
    `family_information_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255),
    `relationship` VARCHAR(255),
    `age` INT,
    `company` VARCHAR(255),
    `occupation` VARCHAR(255),
    `phone` VARCHAR(20)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE emergency_contact (
    `emergency_contact_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255),
    `relationship` VARCHAR(255),
    `age` INT,
    `company` VARCHAR(255),
    `occupation` VARCHAR(255),
    `phone` VARCHAR(20)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_experience (
    `work_experience_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `start_date` DATE,
    `end_date` DATE,
    `company_name` VARCHAR(255),
    `department` VARCHAR(255),
    `job_title` VARCHAR(255),
    `supervise_name` VARCHAR(255),
    `department_telephone` VARCHAR(20),
    `salary` DECIMAL(10, 2),
    `is_still_on_work` BOOLEAN,
    `working_department` VARCHAR(255)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hiring_information (
    `hiring_information_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `probation_period` INT,
    `duration` INT,
    `salary` DECIMAL(10, 2),
    `official_employment_date` DATE,
    `approval_date` DATE,
    `disqualification_date` DATE,
    `note` TEXT
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE health_status (
    `health_status_id` INT NOT NULL AUTO_INCREMENT,
    `member_id` INT,
    `health_status_selection` JSON,
    `others` TEXT,
    PRIMARY KEY (`health_status_id`),
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ======= Layer 2 tables =======

CREATE TABLE staff (
    `staff_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `family_information_id` INT,
    `emergency_contact_id` INT,
    `work_experience_id` INT,
    `hiring_information_id` INT,
    `name` VARCHAR(255),
    `gender` VARCHAR(10),
    `fill_date` DATE,
    `onboard_date` DATE,
    `nationality` VARCHAR(255),
    `education` VARCHAR(255),
    `married` BOOLEAN,
    `position` VARCHAR(255),
    `phone` VARCHAR(20),
    `national_id` VARCHAR(20),
    `mailing_address` TEXT,
    `registered_address` TEXT,
    FOREIGN KEY (`family_information_id`) REFERENCES family_information(`family_information_id`),
    FOREIGN KEY (`emergency_contact_id`) REFERENCES emergency_contact(`emergency_contact_id`),
    FOREIGN KEY (`work_experience_id`) REFERENCES work_experience(`work_experience_id`),
    FOREIGN KEY (`hiring_information_id`) REFERENCES hiring_information(`hiring_information_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usual_sympton_and_family_history (
    `usual_sympton_and_family_history_id` INT NOT NULL AUTO_INCREMENT,
    `member_id` INT,  -- 外鍵，指向 member 表格
    `HPA_selection` JSON,
    `meridian_selection` JSON,
    `neck_and_shoulder_selection` JSON,
    `anus_selection` JSON,
    `family_history_selection` JSON,
    `others` TEXT,
    PRIMARY KEY (`usual_sympton_and_family_history_id`),
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======= Layer 3 tables =======
CREATE TABLE medical_record (
  `medical_record_id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `usual_sympton_and_family_history_id` INT,
  `height` FLOAT,
  `weight` FLOAT,
  `micro_surgery` INT,
  `remark` TEXT NULL,
  PRIMARY KEY (`medical_record_id`),
  FOREIGN KEY (`member_id`) REFERENCES `member`(`member_id`),
  FOREIGN KEY (`usual_sympton_and_family_history_id`) REFERENCES `usual_sympton_and_family_history`(`usual_sympton_and_family_history_id`),
  FOREIGN KEY (`micro_surgery`) REFERENCES `micro_surgery`(`micro_surgery_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory (
  `inventory_id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `staff_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `quantity` INT NOT NULL,
  `stock_in` INT,
  `stock_out` INT,
  `stock_loan` INT,
  `store_id` INT,
  `stock_threshold` INT,
  PRIMARY KEY (`inventory_id`),
  FOREIGN KEY (`product_id`) REFERENCES product(`product_id`),
  FOREIGN KEY (`staff_id`) REFERENCES staff(`staff_id`),
  FOREIGN KEY (`store_id`) REFERENCES store(`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ipn_stress (
    `ipn_stress_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `member_id` INT,
    `a_score` INT,
    `b_score` INT,
    `c_score` INT,
    `d_score` INT,
    `test_date` DATE,
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE therapy_sell (
    `therapy_sell_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `therapy_id` INT,
    `member_id` INT,
    `store_id` INT,
    `staff_id` INT,
    `date` DATE,
    `amount` INT,
    `discount` DECIMAL(10, 2),
    `payment_method` ENUM('Cash', 'CreditCard', 'Transfer', 'Pending','MobilePayment', 'Others') DEFAULT 'Cash', 
    `sale_category` ENUM('Sell', 'Gift', 'Discount', 'Ticket'), 
    `note` TEXT,
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`),
    FOREIGN KEY (`store_id`) REFERENCES store(`store_id`),
    FOREIGN KEY (`staff_id`) REFERENCES staff(`staff_id`),
    FOREIGN KEY (`therapy_id`) REFERENCES therapy(`therapy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE therapy_record (
    `therapy_record_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `therapy_id` INT,
    `member_id` INT,
    `store_id` INT,
    `staff_id` INT,
    `date` DATE,
    `note` TEXT,
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`),
    FOREIGN KEY (`store_id`) REFERENCES store(`store_id`),
    FOREIGN KEY (`staff_id`) REFERENCES staff(`staff_id`),
    FOREIGN KEY (`therapy_id`) REFERENCES therapy(`therapy_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ipn_pure (
    `ipn_pure_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `member_id` INT,
    `staff_id` INT,
    `visceral_fat` DECIMAL(5, 2),
    `blood_preasure` VARCHAR(20),
    `basal_metabolic_rate` INT,
    `date` DATE,
    `body_age` INT,
    `height` INT,
    `weight` DECIMAL(5, 2),
    `bmi` DECIMAL(5, 2),
    `pure_item` VARCHAR(255),
    `note` TEXT,
    FOREIGN KEY (`member_id`) REFERENCES member(`member_id`),
    FOREIGN KEY (`staff_id`) REFERENCES staff(`staff_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_sell (
  `product_sell_id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,            
  `staff_id` INT,                 
  `store_id` INT NOT NULL,             
  `product_id` INT NOT NULL,           
  `date` DATE NOT NULL,                
  `quantity` INT NOT NULL,             
  `unit_price` DECIMAL(10, 2) NOT NULL, 
  `discount_amount` DECIMAL(10, 2) DEFAULT 0.00, 
  `final_price` DECIMAL(10, 2) NOT NULL,
  `payment_method` ENUM('Cash', 'CreditCard', 'Transfer', 'MobilePayment', 'Pending', 'Others') DEFAULT 'Cash', 
  `sale_category` VARCHAR(50),         
  `note` TEXT,                         
  PRIMARY KEY (`product_sell_id`),
  FOREIGN KEY (`member_id`) REFERENCES `member`(`member_id`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`),
  FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`),
  FOREIGN KEY (`product_id`) REFERENCES `product`(`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sales_orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL UNIQUE, -- 銷售單號，例如 "SO-20250613-001"
  `order_date` DATE NOT NULL,                 -- 銷售日期
  `member_id` INT,                            -- 購買人 (關聯 member 表)，允許 NULL
  `staff_id` INT,                             -- 銷售人員 (關聯 staff 表)，允許 NULL
  `store_id` INT NOT NULL,                    -- 銷售單位 (關聯 store 表)
  `subtotal` DECIMAL(12, 2) NOT NULL,         -- 項目小計總和 (折扣前)
  `total_discount` DECIMAL(12, 2) DEFAULT 0.00, -- 整筆訂單的總折價金額
  `grand_total` DECIMAL(12, 2) NOT NULL,      -- 最終總金額 (應收金額)
  `sale_category` VARCHAR(50),                -- 銷售列別
  `note` TEXT,                                -- 備註
  PRIMARY KEY (`order_id`),
  FOREIGN KEY (`member_id`) REFERENCES `member`(`member_id`) ON DELETE SET NULL,
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`staff_id`) ON DELETE SET NULL,
  FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 銷售單項目明細表 (Sales Order Items)
CREATE TABLE `sales_order_items` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,              -- 關聯到 sales_orders 表
  `product_id` INT,                       -- 關聯到 product 表 (如果是產品)
  `therapy_id` INT,                       -- 關聯到 therapy 表 (如果是療程)
  `item_description` VARCHAR(255) NOT NULL, -- 產品或療程名稱
  `item_type` ENUM('Product', 'Therapy') NOT NULL, -- 項目類型
  `unit` VARCHAR(20),                         -- 單位
  `unit_price` DECIMAL(10, 2) NOT NULL,     -- 單價
  `quantity` INT NOT NULL,                  -- 數量 (對應療程的堂數)
  `subtotal` DECIMAL(12, 2) NOT NULL,       -- 小計 (單價 * 數量)
  `category` VARCHAR(50),                 -- 分類
  `note` TEXT,                            -- 單項備註
  PRIMARY KEY (`item_id`),
  FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`order_id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `product`(`product_id`),
  FOREIGN KEY (`therapy_id`) REFERENCES `therapy`(`therapy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `medical_record`
ADD COLUMN `health_status_id` INT,
ADD FOREIGN KEY (`health_status_id`) REFERENCES `health_status`(`health_status_id`);

ALTER TABLE `medical_record`
ADD COLUMN `store_id` INT, 
ADD FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`);

ALTER TABLE `therapy_record` 
ADD COLUMN `remaining_sessions_at_time` INT;

--- 為了讓會員能依照分店查詢---
ALTER TABLE `member`
ADD COLUMN `store_id` INT NOT NULL DEFAULT 1 COMMENT '會員歸屬的店家ID';

ALTER TABLE `member`
ADD CONSTRAINT `fk_member_store`
FOREIGN KEY (`store_id`)
REFERENCES `store`(`store_id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `member`
ALTER COLUMN `store_id` DROP DEFAULT;

--- 為了能讓ipn_stress根據分店查詢自己會員的資料 ---
ALTER TABLE `ipn_stress`
ADD COLUMN `store_id` INT NOT NULL DEFAULT 1 COMMENT '此筆測試紀錄歸屬的店家ID';

ALTER TABLE `ipn_stress`
ADD CONSTRAINT `fk_stress_store`
FOREIGN KEY (`store_id`)
REFERENCES `store`(`store_id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ipn_stress`
ALTER COLUMN `store_id` DROP DEFAULT;

--- 為了 ipn_pure 根據分店 ---
ALTER TABLE `ipn_pure`
ADD COLUMN `store_id` INT NOT NULL DEFAULT 1 COMMENT '此筆淨化紀錄歸屬的店家ID';

ALTER TABLE `ipn_pure`
ADD CONSTRAINT `fk_pure_store`
FOREIGN KEY (`store_id`)
REFERENCES `store`(`store_id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ipn_pure`
ALTER COLUMN `store_id` DROP DEFAULT;

--- ipn_pure 新增內脂肪 ---

ALTER TABLE `ipn_pure`
ADD COLUMN `body_fat_percentage` DECIMAL(5, 2) NULL COMMENT '體脂肪率(%)' AFTER `visceral_fat`;

ALTER TABLE `ipn_pure`
ALTER COLUMN `store_id` DROP DEFAULT;

ALTER TABLE `staff`
ADD COLUMN `account` VARCHAR(50) NULL UNIQUE COMMENT '員工登入帳號',
ADD COLUMN `password` VARCHAR(255) NULL COMMENT '員工登入密碼(應加密儲存)',
ADD COLUMN `store_id` INT NULL COMMENT '員工所屬分店ID',
ADD CONSTRAINT `fk_staff_store` FOREIGN KEY (`store_id`) REFERENCES `store`(`store_id`);

-- 主表：儲存每個產品組合的定義
CREATE TABLE `product_bundles` (
  `bundle_id` INT NOT NULL AUTO_INCREMENT,
  `bundle_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '組合編號，由使用者自訂',
  `name` VARCHAR(255) NOT NULL COMMENT '組合名稱/項目',
  `calculated_price` DECIMAL(12, 2) NOT NULL COMMENT '根據組合內項目自動試算的原始總價',
  `selling_price` DECIMAL(12, 2) NOT NULL COMMENT '管理者手動設定的最終銷售價格',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`bundle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 關聯表：儲存每個組合包含哪些產品或療程
CREATE TABLE `product_bundle_items` (
  `bundle_item_id` INT NOT NULL AUTO_INCREMENT,
  `bundle_id` INT NOT NULL COMMENT '對應到 product_bundles.bundle_id',
  `item_id` INT NOT NULL COMMENT '對應到 product.product_id 或 therapy.therapy_id',
  `item_type` ENUM('Product', 'Therapy') NOT NULL COMMENT '標示此項目是產品還是療程',
  `quantity` INT NOT NULL DEFAULT 1 COMMENT '此項目在組合中的數量',
  PRIMARY KEY (`bundle_item_id`),
  FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles`(`bundle_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
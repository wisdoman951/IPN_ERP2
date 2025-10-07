-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: erp
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

DROP VIEW IF EXISTS `vw_member_product_prices`;
DROP VIEW IF EXISTS `vw_member_therapy_prices`;

--
-- Table structure for table `emergency_contact`
--

DROP TABLE IF EXISTS `emergency_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emergency_contact` (
  `emergency_contact_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relationship` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int DEFAULT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`emergency_contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` enum('product','therapy','product_bundle','therapy_bundle') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_category`
--

DROP TABLE IF EXISTS `product_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_category` (
  `product_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`product_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `product_category_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `product_category_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy_category`
--

DROP TABLE IF EXISTS `therapy_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy_category` (
  `therapy_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`therapy_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `therapy_category_ibfk_1` FOREIGN KEY (`therapy_id`) REFERENCES `therapy` (`therapy_id`) ON DELETE CASCADE,
  CONSTRAINT `therapy_category_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_bundle_category`
--

DROP TABLE IF EXISTS `product_bundle_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bundle_category` (
  `bundle_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`bundle_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `product_bundle_category_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles` (`bundle_id`) ON DELETE CASCADE,
  CONSTRAINT `product_bundle_category_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy_bundle_category`
--

DROP TABLE IF EXISTS `therapy_bundle_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy_bundle_category` (
  `bundle_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`bundle_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `therapy_bundle_category_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `therapy_bundles` (`bundle_id`) ON DELETE CASCADE,
  CONSTRAINT `therapy_bundle_category_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `family_information`
--

DROP TABLE IF EXISTS `family_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `family_information` (
  `family_information_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relationship` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int DEFAULT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`family_information_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_status`
--

DROP TABLE IF EXISTS `health_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_status` (
  `health_status_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int DEFAULT NULL,
  `health_status_selection` json DEFAULT NULL,
  `others` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`health_status_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `health_status_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=441 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hiring_information`
--

DROP TABLE IF EXISTS `hiring_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hiring_information` (
  `hiring_information_id` int NOT NULL AUTO_INCREMENT,
  `probation_period` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `official_employment_date` date DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `disqualification_date` date DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`hiring_information_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `date` date NOT NULL,
  `quantity` int NOT NULL,
  `stock_in` int DEFAULT NULL,
  `stock_out` int DEFAULT NULL,
  `stock_loan` int DEFAULT NULL,
  `store_id` int DEFAULT NULL,
  `stock_threshold` int DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `buyer` varchar(255) DEFAULT NULL,
  `voucher` varchar(255) DEFAULT NULL,
  `note` text,
  PRIMARY KEY (`inventory_id`),
  KEY `product_id` (`product_id`),
  KEY `staff_id` (`staff_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ipn_pure`
--

DROP TABLE IF EXISTS `ipn_pure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ipn_pure` (
  `ipn_pure_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `visceral_fat` decimal(5,2) DEFAULT NULL,
  `body_fat_percentage` decimal(5,2) DEFAULT NULL COMMENT '體脂肪率(%)',
  `blood_preasure` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basal_metabolic_rate` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `body_age` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `pure_item` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `store_id` int NOT NULL COMMENT '此筆淨化紀錄歸屬的店家ID',
  PRIMARY KEY (`ipn_pure_id`),
  KEY `member_id` (`member_id`),
  KEY `staff_id` (`staff_id`),
  KEY `fk_pure_store` (`store_id`),
  CONSTRAINT `fk_pure_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ipn_pure_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`),
  CONSTRAINT `ipn_pure_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ipn_stress`
--

DROP TABLE IF EXISTS `ipn_stress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ipn_stress` (
  `ipn_stress_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int DEFAULT NULL,
  `a_score` int DEFAULT NULL,
  `b_score` int DEFAULT NULL,
  `c_score` int DEFAULT NULL,
  `d_score` int DEFAULT NULL,
  `test_date` date DEFAULT NULL,
  `store_id` int NOT NULL COMMENT '此筆測試紀錄歸屬的店家ID',
  PRIMARY KEY (`ipn_stress_id`),
  KEY `member_id` (`member_id`),
  KEY `fk_stress_store` (`store_id`),
  CONSTRAINT `fk_stress_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ipn_stress_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ipn_stress_answer`
--

DROP TABLE IF EXISTS `ipn_stress_answer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ipn_stress_answer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ipn_stress_id` int NOT NULL,
  `question_no` varchar(10) NOT NULL,
  `answer` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ipn_stress_id` (`ipn_stress_id`),
  CONSTRAINT `ipn_stress_answer_ibfk_1` FOREIGN KEY (`ipn_stress_id`) REFERENCES `ipn_stress` (`ipn_stress_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medical_record`
--

DROP TABLE IF EXISTS `medical_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medical_record` (
  `medical_record_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `usual_sympton_and_family_history_id` int DEFAULT NULL,
  `height` float DEFAULT NULL,
  `weight` float DEFAULT NULL,
  `micro_surgery` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `health_status_id` int DEFAULT NULL,
  `store_id` int DEFAULT NULL,
  PRIMARY KEY (`medical_record_id`),
  KEY `member_id` (`member_id`),
  KEY `usual_sympton_and_family_history_id` (`usual_sympton_and_family_history_id`),
  KEY `micro_surgery` (`micro_surgery`),
  KEY `health_status_id` (`health_status_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `medical_record_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`),
  CONSTRAINT `medical_record_ibfk_2` FOREIGN KEY (`usual_sympton_and_family_history_id`) REFERENCES `usual_sympton_and_family_history` (`usual_sympton_and_family_history_id`),
  CONSTRAINT `medical_record_ibfk_3` FOREIGN KEY (`micro_surgery`) REFERENCES `micro_surgery` (`micro_surgery_id`),
  CONSTRAINT `medical_record_ibfk_4` FOREIGN KEY (`health_status_id`) REFERENCES `health_status` (`health_status_id`),
  CONSTRAINT `medical_record_ibfk_5` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`)
) ENGINE=InnoDB AUTO_INCREMENT=262 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `member`
--

DROP TABLE IF EXISTS `member`;
DROP TABLE IF EXISTS `member_identity_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_identity_type` (
  `identity_type_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `priority` int NOT NULL DEFAULT '100' COMMENT '數字越小代表優先權越高',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否為預設身分類別',
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否為系統保留類型，避免被刪除',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`identity_type_code`),
  UNIQUE KEY `uniq_member_identity_display_name` (`display_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member` (
  `member_id` int NOT NULL AUTO_INCREMENT,
  `member_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `identity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL_MEMBER' COMMENT '對應到 member_identity_type.identity_type_code',
  `birthday` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_type` enum('A','B','AB','O') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `inferrer_id` int DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `store_id` int NOT NULL COMMENT '會員歸屬的店家ID',
  PRIMARY KEY (`member_id`),
  KEY `inferrer_id` (`inferrer_id`),
  KEY `fk_member_store` (`store_id`),
  KEY `identity_type` (`identity_type`),
  CONSTRAINT `fk_member_identity_type` FOREIGN KEY (`identity_type`) REFERENCES `member_identity_type` (`identity_type_code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_member_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `member_ibfk_1` FOREIGN KEY (`inferrer_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=556 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `micro_surgery`
--

DROP TABLE IF EXISTS `micro_surgery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `micro_surgery` (
  `micro_surgery_id` int NOT NULL AUTO_INCREMENT,
  `micro_surgery_selection` text COLLATE utf8mb4_unicode_ci,
  `micro_surgery_description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`micro_surgery_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL COMMENT '最新進貨成本價',
  `visible_store_ids` json DEFAULT NULL COMMENT '限制顯示的分店 store_id 列表，NULL 表示全店可見',
  `visible_permissions` json DEFAULT NULL COMMENT '限制可見的身分權限列表，NULL 表示所有權限可見',
  `status` enum('PUBLISHED','UNPUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  `unpublished_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=307 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_bundle_items`
--

DROP TABLE IF EXISTS `product_bundle_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bundle_items` (
  `bundle_item_id` int NOT NULL AUTO_INCREMENT,
  `bundle_id` int NOT NULL COMMENT '對應到 product_bundles.bundle_id',
  `item_id` int NOT NULL COMMENT '對應到 product.product_id 或 therapy.therapy_id',
  `item_type` enum('Product','Therapy') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '標示此項目是產品還是療程',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '此項目在組合中的數量',
  PRIMARY KEY (`bundle_item_id`),
  KEY `bundle_id` (`bundle_id`),
  CONSTRAINT `product_bundle_items_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles` (`bundle_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_bundles`
--

DROP TABLE IF EXISTS `product_bundles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bundles` (
  `bundle_id` int NOT NULL AUTO_INCREMENT,
  `bundle_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組合編號，由使用者自訂',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組合名稱/項目',
  `calculated_price` decimal(12,2) DEFAULT NULL COMMENT '根據組合內項目自動試算的原始總價',
  `selling_price` decimal(12,2) DEFAULT NULL COMMENT '管理者手動設定的最終銷售價格',
  `visible_store_ids` json DEFAULT NULL COMMENT '限制顯示的分店 store_id 列表，NULL 表示全店可見',
  `visible_permissions` json DEFAULT NULL COMMENT '限制可見的身分權限列表，NULL 表示所有權限可見',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `status` enum('PUBLISHED','UNPUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  `unpublished_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`bundle_id`),
  UNIQUE KEY `bundle_code` (`bundle_code`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `member_price_book`
--

DROP TABLE IF EXISTS `member_price_book`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_price_book` (
  `price_book_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '價目表名稱',
  `identity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '對應 member_identity_type.identity_type_code',
  `scope_type` enum('ALL','PRODUCT','THERAPY','PRODUCT_BUNDLE','THERAPY_BUNDLE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALL' COMMENT '價目表的適用項目範圍',
  `status` enum('DRAFT','ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `priority` int NOT NULL DEFAULT '100' COMMENT '處理價目表時的優先順序，數字越小優先度越高',
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`price_book_id`),
  KEY `idx_member_price_book_identity` (`identity_type`),
  KEY `idx_member_price_book_status` (`status`),
  UNIQUE KEY `uniq_member_price_book_identity_scope_name` (`identity_type`,`scope_type`,`name`),
  CONSTRAINT `fk_member_price_book_identity` FOREIGN KEY (`identity_type`) REFERENCES `member_identity_type` (`identity_type_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_member_price_book_validity` CHECK (`valid_to` IS NULL OR `valid_from` IS NULL OR `valid_to` >= `valid_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `member_price_book_store`
--

DROP TABLE IF EXISTS `member_price_book_store`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_price_book_store` (
  `price_book_id` int NOT NULL,
  `store_id` int NOT NULL,
  PRIMARY KEY (`price_book_id`,`store_id`),
  KEY `idx_member_price_book_store_store` (`store_id`),
  CONSTRAINT `fk_member_price_book_store_price_book` FOREIGN KEY (`price_book_id`) REFERENCES `member_price_book` (`price_book_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_member_price_book_store_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `member_price_book_item`
--

DROP TABLE IF EXISTS `member_price_book_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_price_book_item` (
  `price_book_item_id` int NOT NULL AUTO_INCREMENT,
  `price_book_id` int NOT NULL,
  `item_type` enum('PRODUCT','THERAPY','PRODUCT_BUNDLE','THERAPY_BUNDLE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_id` int NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TWD',
  `min_quantity` int NOT NULL DEFAULT '1' COMMENT '價格適用的最低購買數量',
  `max_quantity` int DEFAULT NULL COMMENT '價格適用的最高購買數量，NULL 代表無上限',
  `custom_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '針對特定身分顯示的自訂品號',
  `custom_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '針對特定身分顯示的自訂名稱',
  `metadata` json DEFAULT NULL COMMENT '額外資訊，例如包裝數量、促銷備註等',
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`price_book_item_id`),
  UNIQUE KEY `uniq_member_price_book_item` (`price_book_id`,`item_type`,`item_id`,`min_quantity`),
  UNIQUE KEY `uniq_member_price_book_custom_code` (`price_book_id`,`custom_code`),
  KEY `idx_member_price_book_item_status` (`status`),
  CONSTRAINT `chk_member_price_book_item_price_non_negative` CHECK (`price` >= 0),
  CONSTRAINT `chk_member_price_book_item_quantity_range` CHECK (`max_quantity` IS NULL OR `max_quantity` >= `min_quantity`),
  CONSTRAINT `fk_member_price_book_item_price_book` FOREIGN KEY (`price_book_id`) REFERENCES `member_price_book` (`price_book_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- View structure for view `vw_member_product_prices`
--

DROP VIEW IF EXISTS `vw_member_product_prices`;
CREATE VIEW `vw_member_product_prices` AS
SELECT
    p.product_id AS product_id,
    p.code AS base_product_code,
    p.name AS base_product_name,
    mpb.price_book_id,
    mpb.name AS price_book_name,
    mpb.identity_type,
    mit.display_name AS identity_display_name,
    mpb.priority,
    mpb.status,
    mpb.valid_from,
    mpb.valid_to,
    mpi.price_book_item_id,
    mpi.price,
    mpi.currency,
    mpi.min_quantity,
    mpi.max_quantity,
    mpi.custom_code,
    COALESCE(mpi.custom_name, p.name) AS custom_name,
    mpi.metadata,
    mpi.status AS item_status
FROM member_price_book mpb
JOIN member_identity_type mit ON mpb.identity_type = mit.identity_type_code
JOIN member_price_book_item mpi ON mpb.price_book_id = mpi.price_book_id AND mpi.item_type = 'PRODUCT'
JOIN product p ON mpi.item_id = p.product_id;

--
-- View structure for view `vw_member_therapy_prices`
--

DROP VIEW IF EXISTS `vw_member_therapy_prices`;
CREATE VIEW `vw_member_therapy_prices` AS
SELECT
    t.therapy_id AS therapy_id,
    t.code AS base_therapy_code,
    t.name AS base_therapy_name,
    mpb.price_book_id,
    mpb.name AS price_book_name,
    mpb.identity_type,
    mit.display_name AS identity_display_name,
    mpb.priority,
    mpb.status,
    mpb.valid_from,
    mpb.valid_to,
    mpi.price_book_item_id,
    mpi.price,
    mpi.currency,
    mpi.min_quantity,
    mpi.max_quantity,
    mpi.custom_code,
    COALESCE(mpi.custom_name, t.name) AS custom_name,
    mpi.metadata,
    mpi.status AS item_status
FROM member_price_book mpb
JOIN member_identity_type mit ON mpb.identity_type = mit.identity_type_code
JOIN member_price_book_item mpi ON mpb.price_book_id = mpi.price_book_id AND mpi.item_type = 'THERAPY'
JOIN therapy t ON mpi.item_id = t.therapy_id;

--
-- Table structure for table `therapy_bundle_items`
--

DROP TABLE IF EXISTS `therapy_bundle_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy_bundle_items` (
  `bundle_item_id` int NOT NULL AUTO_INCREMENT,
  `bundle_id` int NOT NULL COMMENT '對應到 therapy_bundles.bundle_id',
  `item_id` int NOT NULL COMMENT '對應到 product.product_id 或 therapy.therapy_id',
  `item_type` enum('Product','Therapy') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '標示此項目是產品還是療程',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '此項目在組合中的數量',
  PRIMARY KEY (`bundle_item_id`),
  KEY `bundle_id` (`bundle_id`),
  CONSTRAINT `therapy_bundle_items_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `therapy_bundles` (`bundle_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy_bundles`
--

DROP TABLE IF EXISTS `therapy_bundles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy_bundles` (
  `bundle_id` int NOT NULL AUTO_INCREMENT,
  `bundle_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組合編號，由使用者自訂',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組合名稱/項目',
  `calculated_price` decimal(12,2) DEFAULT NULL COMMENT '根據組合內項目自動試算的原始總價',
  `selling_price` decimal(12,2) DEFAULT NULL COMMENT '管理者手動設定的最終銷售價格',
  `visible_store_ids` json DEFAULT NULL COMMENT '限制顯示的分店 store_id 列表，NULL 表示全店可見',
  `visible_permissions` json DEFAULT NULL COMMENT '限制可見的身分權限列表，NULL 表示所有權限可見',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `status` enum('PUBLISHED','UNPUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  `unpublished_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`bundle_id`),
  UNIQUE KEY `bundle_code` (`bundle_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_sell`
--

DROP TABLE IF EXISTS `product_sell`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_sell` (
  `product_sell_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `staff_id` int DEFAULT NULL,
  `store_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `final_price` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','CreditCard','Transfer','MobilePayment','Pending','Others') COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `sale_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`product_sell_id`),
  KEY `member_id` (`member_id`),
  KEY `staff_id` (`staff_id`),
  KEY `store_id` (`store_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_sell_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`),
  CONSTRAINT `product_sell_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `product_sell_ibfk_3` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
  CONSTRAINT `product_sell_ibfk_4` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `therapy_id` int DEFAULT NULL,
  `item_description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('Product','Therapy') COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`item_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `therapy_id` (`therapy_id`),
  CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `sales_order_items_ibfk_3` FOREIGN KEY (`therapy_id`) REFERENCES `therapy` (`therapy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_date` date NOT NULL,
  `member_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `store_id` int NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `total_discount` decimal(12,2) DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL,
  `sale_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `member_id` (`member_id`),
  KEY `staff_id` (`staff_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_ibfk_3` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `family_information_id` int DEFAULT NULL,
  `emergency_contact_id` int DEFAULT NULL,
  `work_experience_id` int DEFAULT NULL,
  `hiring_information_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fill_date` date DEFAULT NULL,
  `onboard_date` date DEFAULT NULL,
  `nationality` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `education` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `married` tinyint(1) DEFAULT NULL,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `national_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_address` text COLLATE utf8mb4_unicode_ci,
  `registered_address` text COLLATE utf8mb4_unicode_ci,
  `account` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '員工登入帳號',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '員工登入密碼(應加密儲存)',
  `reset_requested` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否申請密碼重設',
  `permission` VARCHAR(50) DEFAULT NULL,
  `store_id` int DEFAULT NULL COMMENT '員工所屬分店ID',
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `account` (`account`),
  KEY `family_information_id` (`family_information_id`),
  KEY `emergency_contact_id` (`emergency_contact_id`),
  KEY `work_experience_id` (`work_experience_id`),
  KEY `hiring_information_id` (`hiring_information_id`),
  KEY `fk_staff_store` (`store_id`),
  CONSTRAINT `fk_staff_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`family_information_id`) REFERENCES `family_information` (`family_information_id`),
  CONSTRAINT `staff_ibfk_2` FOREIGN KEY (`emergency_contact_id`) REFERENCES `emergency_contact` (`emergency_contact_id`),
  CONSTRAINT `staff_ibfk_3` FOREIGN KEY (`work_experience_id`) REFERENCES `work_experience` (`work_experience_id`),
  CONSTRAINT `staff_ibfk_4` FOREIGN KEY (`hiring_information_id`) REFERENCES `hiring_information` (`hiring_information_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store`
--

DROP TABLE IF EXISTS `store`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store` (
  `store_id` int NOT NULL AUTO_INCREMENT,
  `store_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`store_id`),
  UNIQUE KEY `store_name` (`store_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store_account`
--

DROP TABLE IF EXISTS `store_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_account` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission` enum('admin','basic') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'basic',
  `store_id` int NOT NULL,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `account` (`account`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `store_account_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy`
--

DROP TABLE IF EXISTS `therapy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy` (
  `therapy_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `visible_store_ids` json DEFAULT NULL COMMENT '限制顯示的分店 store_id 列表，NULL 表示全店可見',
  `visible_permissions` json DEFAULT NULL COMMENT '限制可見的身分權限列表，NULL 表示所有權限可見',
  `status` enum('PUBLISHED','UNPUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  `unpublished_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`therapy_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy_record`
--

DROP TABLE IF EXISTS `therapy_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `therapy_record` (
  `therapy_record_id` int NOT NULL AUTO_INCREMENT,
  `therapy_id` int DEFAULT NULL,
  `member_id` int DEFAULT NULL,
  `store_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `deduct_sessions` int DEFAULT 1,
  `remaining_sessions_at_time` int DEFAULT NULL,
  PRIMARY KEY (`therapy_record_id`),
  KEY `member_id` (`member_id`),
  KEY `store_id` (`store_id`),
  KEY `staff_id` (`staff_id`),
  KEY `therapy_id` (`therapy_id`),
  CONSTRAINT `therapy_record_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`),
  CONSTRAINT `therapy_record_ibfk_2` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
  CONSTRAINT `therapy_record_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `therapy_record_ibfk_4` FOREIGN KEY (`therapy_id`) REFERENCES `therapy` (`therapy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `therapy_sell`
--

DROP TABLE IF EXISTS `therapy_sell`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
  CREATE TABLE `therapy_sell` (
    `therapy_sell_id` int NOT NULL AUTO_INCREMENT,
    `therapy_id` int DEFAULT NULL,
    `therapy_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `member_id` int DEFAULT NULL,
  `store_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT NULL,
  `final_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('Cash','CreditCard','Transfer','Pending','MobilePayment','Others') COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `sale_category` enum('Sell','Gift','Discount','Ticket') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`therapy_sell_id`),
  KEY `member_id` (`member_id`),
  KEY `store_id` (`store_id`),
  KEY `staff_id` (`staff_id`),
  KEY `therapy_id` (`therapy_id`),
  CONSTRAINT `therapy_sell_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`),
  CONSTRAINT `therapy_sell_ibfk_2` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
  CONSTRAINT `therapy_sell_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `therapy_sell_ibfk_4` FOREIGN KEY (`therapy_id`) REFERENCES `therapy` (`therapy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usual_sympton_and_family_history`
--

DROP TABLE IF EXISTS `usual_sympton_and_family_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usual_sympton_and_family_history` (
  `usual_sympton_and_family_history_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int DEFAULT NULL,
  `HPA_selection` json DEFAULT NULL,
  `meridian_selection` json DEFAULT NULL,
  `neck_and_shoulder_selection` json DEFAULT NULL,
  `anus_selection` json DEFAULT NULL,
  `family_history_selection` json DEFAULT NULL,
  `others` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`usual_sympton_and_family_history_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `usual_sympton_and_family_history_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=351 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_experience`
--

DROP TABLE IF EXISTS `work_experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_experience` (
  `work_experience_id` int NOT NULL AUTO_INCREMENT,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supervise_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_telephone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `is_still_on_work` tinyint(1) DEFAULT NULL,
  `working_department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`work_experience_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-17 14:47:22

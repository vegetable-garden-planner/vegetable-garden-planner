USE `vegetable_garden_planner`;

-- 기존 요금제 코드가 없으므로 임시로 nullable 컬럼을 만든 뒤 기존 행을 보정한다.
ALTER TABLE `plans`
  ADD COLUMN `code` VARCHAR(100) NULL AFTER `id`,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'KRW' AFTER `price`,
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE AFTER `billing_cycle`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `plans`
SET `code` = CONCAT('plan_', `id`)
WHERE `code` IS NULL OR `code` = '';

ALTER TABLE `plans`
  MODIFY COLUMN `code` VARCHAR(100) NOT NULL,
  ADD UNIQUE KEY `uk_plans_code` (`code`);

ALTER TABLE `plan_features`
  MODIFY COLUMN `limit_value` INT NULL,
  ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT TRUE AFTER `limit_value`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `enabled`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD UNIQUE KEY `uk_plan_features_plan_key` (`plan_id`, `feature_key`);

ALTER TABLE `subscriptions`
  ADD COLUMN `provider` VARCHAR(100) NULL AFTER `expires_at`,
  ADD COLUMN `provider_subscription_id` VARCHAR(255) NULL AFTER `provider`,
  ADD COLUMN `current_period_start` DATETIME NULL AFTER `provider_subscription_id`,
  ADD COLUMN `current_period_end` DATETIME NULL AFTER `current_period_start`,
  ADD COLUMN `cancel_at_period_end` BOOLEAN NOT NULL DEFAULT FALSE AFTER `current_period_end`,
  ADD COLUMN `canceled_at` DATETIME NULL AFTER `cancel_at_period_end`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `canceled_at`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD UNIQUE KEY `uk_subscriptions_provider_id` (`provider_subscription_id`),
  ADD KEY `idx_subscriptions_user_status` (`user_id`, `status`);

-- 결제 승인 전에는 payment_key가 없을 수 있으므로 nullable로 바꾼다.
ALTER TABLE `payments`
  ADD COLUMN `subscription_id` BIGINT UNSIGNED NULL AFTER `user_id`,
  ADD COLUMN `order_id` VARCHAR(255) NULL AFTER `subscription_id`,
  MODIFY COLUMN `payment_key` VARCHAR(255) NULL,
  ADD COLUMN `provider` VARCHAR(100) NULL AFTER `payment_key`,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'KRW' AFTER `amount`,
  ADD COLUMN `method` VARCHAR(100) NULL AFTER `currency`,
  ADD COLUMN `requested_at` DATETIME NULL AFTER `status`,
  ADD COLUMN `failed_at` DATETIME NULL AFTER `paid_at`,
  ADD COLUMN `failure_code` VARCHAR(255) NULL AFTER `failed_at`,
  ADD COLUMN `failure_message` TEXT NULL AFTER `failure_code`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `failure_message`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `payments`
SET
  `order_id` = CONCAT('legacy_', `id`),
  `provider` = 'legacy',
  `requested_at` = COALESCE(`paid_at`, `created_at`)
WHERE `order_id` IS NULL OR `provider` IS NULL OR `requested_at` IS NULL;

ALTER TABLE `payments`
  MODIFY COLUMN `order_id` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `provider` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `requested_at` DATETIME NOT NULL,
  ADD UNIQUE KEY `uk_payments_order_id` (`order_id`),
  ADD KEY `idx_payments_user_status` (`user_id`, `status`),
  ADD CONSTRAINT `fk_payments_subscription`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`);

ALTER TABLE `payment_refunds`
  ADD COLUMN `refund_key` VARCHAR(255) NULL AFTER `payment_id`,
  ADD COLUMN `status` VARCHAR(100) NULL AFTER `reason`,
  ADD COLUMN `requested_at` DATETIME NULL AFTER `status`,
  MODIFY COLUMN `refunded_at` DATETIME NULL,
  ADD COLUMN `failure_message` TEXT NULL AFTER `refunded_at`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `failure_message`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `payment_refunds`
SET
  `status` = 'succeeded',
  `requested_at` = COALESCE(`refunded_at`, `created_at`)
WHERE `status` IS NULL OR `requested_at` IS NULL;

ALTER TABLE `payment_refunds`
  MODIFY COLUMN `status` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `requested_at` DATETIME NOT NULL,
  ADD UNIQUE KEY `uk_payment_refunds_refund_key` (`refund_key`),
  ADD KEY `idx_payment_refunds_payment_status` (`payment_id`, `status`);

CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(100) NOT NULL,
  `event_id` VARCHAR(255) NOT NULL,
  `event_type` VARCHAR(255) NOT NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `processed_at` DATETIME NULL,
  `error_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_events_event_id` (`event_id`),
  KEY `idx_webhook_events_provider_status` (`provider`, `status`)
) ENGINE=InnoDB;

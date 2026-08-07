CREATE DATABASE IF NOT EXISTS `vegetable_garden_planner`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `vegetable_garden_planner`;

CREATE TABLE IF NOT EXISTS `climate_zones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_climate_zones_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `regions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `climate_zone_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_regions_name` (`name`),
  CONSTRAINT `fk_regions_climate_zone`
    FOREIGN KEY (`climate_zone_id`) REFERENCES `climate_zones` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `region_id` BIGINT UNSIGNED NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  CONSTRAINT `fk_users_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `social_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `provider` VARCHAR(255) NOT NULL,
  `provider_user_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_social_accounts_provider_user` (`provider`, `provider_user_id`),
  CONSTRAINT `fk_social_accounts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `notification_enabled` BOOLEAN NOT NULL,
  `email_enabled` BOOLEAN NOT NULL,
  `unit` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_settings_user` (`user_id`),
  CONSTRAINT `fk_user_settings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `gardens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id` BIGINT UNSIGNED NOT NULL,
  `region_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `width` DECIMAL(10,2) NOT NULL,
  `height` DECIMAL(10,2) NOT NULL,
  `cell_size` DECIMAL(10,2) NOT NULL,
  `environment` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_gardens_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_gardens_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `garden_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `garden_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(255) NOT NULL,
  `joined_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_garden_members_garden_user` (`garden_id`, `user_id`),
  CONSTRAINT `fk_garden_members_garden`
    FOREIGN KEY (`garden_id`) REFERENCES `gardens` (`id`),
  CONSTRAINT `fk_garden_members_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `garden_invitations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `garden_id` BIGINT UNSIGNED NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_garden_invitations_token` (`token`),
  CONSTRAINT `fk_garden_invitations_garden`
    FOREIGN KEY (`garden_id`) REFERENCES `gardens` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `garden_activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `garden_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `target_type` VARCHAR(255) NOT NULL,
  `target_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_garden_activity_logs_garden`
    FOREIGN KEY (`garden_id`) REFERENCES `gardens` (`id`),
  CONSTRAINT `fk_garden_activity_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `seasons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `garden_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_seasons_garden`
    FOREIGN KEY (`garden_id`) REFERENCES `gardens` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `season_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `rating` INT NOT NULL,
  `result` VARCHAR(255) NOT NULL,
  `memo` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_season_reviews_season` (`season_id`),
  CONSTRAINT `fk_season_reviews_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `season_snapshots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `layout_data` JSON NOT NULL,
  `saved_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_season_snapshots_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crop_families` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `rotation_years` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crop_families_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crops` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `image` VARCHAR(255) NULL,
  `difficulty` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crops_name` (`name`),
  CONSTRAINT `fk_crops_family`
    FOREIGN KEY (`family_id`) REFERENCES `crop_families` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crop_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crop_categories_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crop_category_map` (
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`crop_id`, `category_id`),
  KEY `idx_crop_category_map_category` (`category_id`),
  CONSTRAINT `fk_crop_category_map_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`),
  CONSTRAINT `fk_crop_category_map_category`
    FOREIGN KEY (`category_id`) REFERENCES `crop_categories` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `cultivation_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `region_id` BIGINT UNSIGNED NOT NULL,
  `environment` VARCHAR(255) NOT NULL,
  `sowing_start` DATE NOT NULL,
  `sowing_end` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cultivation_rules_scope` (`crop_id`, `region_id`, `environment`),
  CONSTRAINT `fk_cultivation_rules_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`),
  CONSTRAINT `fk_cultivation_rules_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `plant_spacing_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `plant_spacing` DECIMAL(10,2) NOT NULL,
  `row_spacing` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plant_spacing_rules_crop` (`crop_id`),
  CONSTRAINT `fk_plant_spacing_rules_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `watering_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `growth_stage` VARCHAR(255) NOT NULL,
  `interval_days` INT NOT NULL,
  `guide_text` TEXT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_watering_rules_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `task_types` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_types_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crop_schedule_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `task_type_id` BIGINT UNSIGNED NOT NULL,
  `base_event` VARCHAR(255) NOT NULL,
  `offset_days` INT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_crop_schedule_templates_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`),
  CONSTRAINT `fk_crop_schedule_templates_task_type`
    FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `crop_sources` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `source_name` VARCHAR(255) NOT NULL,
  `source_url` VARCHAR(255) NOT NULL,
  `reviewed_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_crop_sources_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `plantings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `start_x` INT UNSIGNED NOT NULL,
  `start_y` INT UNSIGNED NOT NULL,
  `width` INT UNSIGNED NOT NULL,
  `height` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_plantings_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `fk_plantings_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `planting_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL,
  `sowing_date` DATE NULL,
  `transplant_date` DATE NULL,
  `harvest_start` DATE NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_planting_details_planting` (`planting_id`),
  CONSTRAINT `fk_planting_details_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `planting_warnings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `warning_type` VARCHAR(255) NOT NULL,
  `level` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `resolved_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_planting_warnings_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `layout_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `version` INT NOT NULL,
  `layout_data` JSON NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_layout_versions_season_version` (`season_id`, `version`),
  CONSTRAINT `fk_layout_versions_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `fk_layout_versions_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `planting_id` BIGINT UNSIGNED NULL,
  `task_type_id` BIGINT UNSIGNED NOT NULL,
  `due_date` DATE NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tasks_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `fk_tasks_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`),
  CONSTRAINT `fk_tasks_task_type`
    FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `task_recurrences` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `frequency` VARCHAR(255) NOT NULL,
  `interval_value` INT NOT NULL,
  `end_date` DATE NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_recurrences_task` (`task_id`),
  CONSTRAINT `fk_task_recurrences_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `task_completions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `completed_at` DATETIME NOT NULL,
  `memo` TEXT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_task_completions_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `fk_task_completions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `watering_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `interval_days` INT NOT NULL,
  `next_watering_at` DATETIME NOT NULL,
  `enabled` BOOLEAN NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_watering_schedules_planting` (`planting_id`),
  CONSTRAINT `fk_watering_schedules_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `watering_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `watered_at` DATETIME NOT NULL,
  `amount` DECIMAL(10,2) NULL,
  `memo` TEXT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_watering_logs_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`),
  CONSTRAINT `fk_watering_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `watering_snoozes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `watering_schedule_id` BIGINT UNSIGNED NOT NULL,
  `original_date` DATETIME NOT NULL,
  `snoozed_until` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_watering_snoozes_schedule`
    FOREIGN KEY (`watering_schedule_id`) REFERENCES `watering_schedules` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `work_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id` BIGINT UNSIGNED NOT NULL,
  `planting_id` BIGINT UNSIGNED NULL,
  `task_type_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `worked_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_work_logs_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `fk_work_logs_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`),
  CONSTRAINT `fk_work_logs_task_type`
    FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `fk_work_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `growth_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `recorded_at` DATETIME NOT NULL,
  `height` DECIMAL(10,2) NULL,
  `condition` VARCHAR(255) NULL,
  `memo` TEXT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_growth_records_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `record_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_type` VARCHAR(255) NOT NULL,
  `record_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_record_images_target` (`record_type`, `record_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `harvest_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `planting_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `harvested_at` DATETIME NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_harvest_records_planting`
    FOREIGN KEY (`planting_id`) REFERENCES `plantings` (`id`),
  CONSTRAINT `fk_harvest_records_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `harvest_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `harvest_record_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_harvest_images_record`
    FOREIGN KEY (`harvest_record_id`) REFERENCES `harvest_records` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `harvest_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `harvest_record_id` BIGINT UNSIGNED NOT NULL,
  `quality` VARCHAR(255) NOT NULL,
  `memo` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_harvest_reviews_record` (`harvest_record_id`),
  CONSTRAINT `fk_harvest_reviews_record`
    FOREIGN KEY (`harvest_record_id`) REFERENCES `harvest_records` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `read_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `task_type_id` BIGINT UNSIGNED NOT NULL,
  `enabled` BOOLEAN NOT NULL,
  `email_enabled` BOOLEAN NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notification_settings_user_task` (`user_id`, `task_type_id`),
  CONSTRAINT `fk_notification_settings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_notification_settings_task_type`
    FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `notification_id` BIGINT UNSIGNED NOT NULL,
  `channel` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `sent_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notification_logs_notification`
    FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW',
  `billing_cycle` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plans_code` (`code`),
  UNIQUE KEY `uk_plans_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `plan_features` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `feature_key` VARCHAR(255) NOT NULL,
  `limit_value` INT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_features_plan_key` (`plan_id`, `feature_key`),
  CONSTRAINT `fk_plan_features_plan`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `started_at` DATETIME NOT NULL,
  `expires_at` DATETIME NULL,
  `provider` VARCHAR(100) NULL,
  `provider_subscription_id` VARCHAR(255) NULL,
  `current_period_start` DATETIME NULL,
  `current_period_end` DATETIME NULL,
  `cancel_at_period_end` BOOLEAN NOT NULL DEFAULT FALSE,
  `canceled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscriptions_provider_id` (`provider_subscription_id`),
  KEY `idx_subscriptions_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_subscriptions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_subscriptions_plan`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `subscription_id` BIGINT UNSIGNED NULL,
  `order_id` VARCHAR(255) NOT NULL,
  `payment_key` VARCHAR(255) NULL,
  `provider` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW',
  `method` VARCHAR(100) NULL,
  `status` VARCHAR(255) NOT NULL,
  `requested_at` DATETIME NOT NULL,
  `paid_at` DATETIME NULL,
  `failed_at` DATETIME NULL,
  `failure_code` VARCHAR(255) NULL,
  `failure_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_order_id` (`order_id`),
  UNIQUE KEY `uk_payments_payment_key` (`payment_key`),
  KEY `idx_payments_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_payments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_payments_subscription`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_id` BIGINT UNSIGNED NOT NULL,
  `refund_key` VARCHAR(255) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `reason` TEXT NULL,
  `status` VARCHAR(100) NOT NULL,
  `requested_at` DATETIME NOT NULL,
  `refunded_at` DATETIME NULL,
  `failure_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_refunds_refund_key` (`refund_key`),
  KEY `idx_payment_refunds_payment_status` (`payment_id`, `status`),
  CONSTRAINT `fk_payment_refunds_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS `admin_change_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NOT NULL,
  `table_name` VARCHAR(255) NOT NULL,
  `record_id` BIGINT UNSIGNED NOT NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_admin_change_logs_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inquiries_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `inquiry_answers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inquiry_id` BIGINT UNSIGNED NOT NULL,
  `admin_id` BIGINT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inquiry_answers_inquiry`
    FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries` (`id`),
  CONSTRAINT `fk_inquiry_answers_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `data_error_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `crop_id` BIGINT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_data_error_reports_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_data_error_reports_crop`
    FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`)
) ENGINE=InnoDB;

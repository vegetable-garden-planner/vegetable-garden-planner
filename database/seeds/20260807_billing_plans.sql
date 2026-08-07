USE `vegetable_garden_planner`;

START TRANSACTION;

INSERT INTO `plans` (
  `code`,
  `name`,
  `price`,
  `currency`,
  `billing_cycle`,
  `is_active`
) VALUES
  ('free', CONVERT(0xEBACB4EBA38C USING utf8mb4), 0.00, 'KRW', 'monthly', TRUE),
  ('pro', CONVERT(0xED9484EBA19C USING utf8mb4), 4900.00, 'KRW', 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `price` = VALUES(`price`),
  `currency` = VALUES(`currency`),
  `billing_cycle` = VALUES(`billing_cycle`),
  `is_active` = VALUES(`is_active`);

INSERT INTO `plan_features` (
  `plan_id`,
  `feature_key`,
  `limit_value`,
  `enabled`
)
SELECT `id`, 'max_gardens', 1, TRUE FROM `plans` WHERE `code` = 'free'
UNION ALL
SELECT `id`, 'max_seasons', 2, TRUE FROM `plans` WHERE `code` = 'free'
UNION ALL
SELECT `id`, 'max_members', 1, TRUE FROM `plans` WHERE `code` = 'free'
UNION ALL
SELECT `id`, 'pdf_export', NULL, FALSE FROM `plans` WHERE `code` = 'free'
UNION ALL
SELECT `id`, 'max_gardens', NULL, TRUE FROM `plans` WHERE `code` = 'pro'
UNION ALL
SELECT `id`, 'max_seasons', NULL, TRUE FROM `plans` WHERE `code` = 'pro'
UNION ALL
SELECT `id`, 'max_members', 5, TRUE FROM `plans` WHERE `code` = 'pro'
UNION ALL
SELECT `id`, 'pdf_export', NULL, TRUE FROM `plans` WHERE `code` = 'pro'
ON DUPLICATE KEY UPDATE
  `limit_value` = VALUES(`limit_value`),
  `enabled` = VALUES(`enabled`);

COMMIT;

USE `vegetable_garden_planner`;

-- 같은 작물과 생육 단계의 규칙이 여러 개 있으면 유니크 키 추가가 실패한다.
-- 실패한 경우 중복 규칙을 먼저 하나로 정리한 뒤 이 파일을 다시 실행한다.
UPDATE `watering_rules`
SET `guide_text` = ''
WHERE `guide_text` IS NULL;

ALTER TABLE `watering_rules`
  MODIFY COLUMN `guide_text` TEXT NOT NULL,
  ADD UNIQUE KEY `uk_watering_rules_crop_stage` (`crop_id`, `growth_stage`);

ALTER TABLE `watering_schedules`
  ADD COLUMN `updated_at` DATETIME NULL AFTER `enabled`;

UPDATE `watering_schedules`
SET `updated_at` = CURRENT_TIMESTAMP
WHERE `updated_at` IS NULL;

ALTER TABLE `watering_schedules`
  MODIFY COLUMN `updated_at` DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

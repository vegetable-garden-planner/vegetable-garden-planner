USE `vegetable_garden_planner`;

-- 완료 취소 시 원래 물주기 예정일을 복원하기 위한 컬럼이다.
ALTER TABLE `watering_logs`
  ADD COLUMN `scheduled_for` DATETIME NULL AFTER `user_id`;

-- 기존 기록은 정확한 예정일을 알 수 없으므로 실제 완료 시각으로 보정한다.
UPDATE `watering_logs`
SET `scheduled_for` = `watered_at`
WHERE `scheduled_for` IS NULL;

ALTER TABLE `watering_logs`
  MODIFY COLUMN `scheduled_for` DATETIME NOT NULL;

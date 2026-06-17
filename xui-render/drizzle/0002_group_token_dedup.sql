-- Migration: uuidToken -> groupToken, dedup constraint, remove qrCodeUrl, add updatedAt to records

-- 1. Rename uuidToken to groupToken in groups table
ALTER TABLE `groups` RENAME COLUMN `uuidToken` TO `groupToken`;

-- 2. Rename the index on uuidToken
DROP INDEX `idx_groups_uuidToken` ON `groups`;
CREATE INDEX `idx_groups_groupToken` ON `groups` (`groupToken`);

-- 3. Remove qrCodeUrl column from records (no longer stored, generated client-side)
ALTER TABLE `records` DROP COLUMN `qrCodeUrl`;

-- 4. Add updatedAt column to records
ALTER TABLE `records` ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 5. Add unique constraint on records (accelerateIp, acceleratePort) for dedup
-- First remove any duplicate rows keeping the latest one
DELETE r1 FROM `records` r1
INNER JOIN `records` r2
WHERE r1.accelerateIp = r2.accelerateIp
  AND r1.acceleratePort = r2.acceleratePort
  AND r1.id < r2.id;

-- Then add the unique constraint
ALTER TABLE `records` ADD CONSTRAINT `uq_records_node` UNIQUE (`accelerateIp`, `acceleratePort`);

-- 6. Add unique constraint on group_records (groupId, recordId)
ALTER TABLE `group_records` ADD CONSTRAINT `uq_gr_group_record` UNIQUE (`groupId`, `recordId`);

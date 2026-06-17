CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`usageCount` bigint NOT NULL DEFAULT 0,
	`createdBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `group_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`recordId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(128) NOT NULL,
	`uuidToken` varchar(64) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`description` text,
	`createdBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_uuidToken_unique` UNIQUE(`uuidToken`)
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`panelId` varchar(256) NOT NULL,
	`inboundId` int NOT NULL,
	`remark` varchar(256) DEFAULT '',
	`accelerateIp` varchar(64) NOT NULL,
	`acceleratePort` int NOT NULL,
	`vmessLink` text,
	`clashLink` text,
	`qrCodeUrl` text,
	`protocol` varchar(32) DEFAULT 'vmess',
	`batchId` varchar(64),
	`status` enum('success','failed','skipped') NOT NULL DEFAULT 'success',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_apikeys_keyHash` ON `api_keys` (`keyHash`);--> statement-breakpoint
CREATE INDEX `idx_gr_groupId` ON `group_records` (`groupId`);--> statement-breakpoint
CREATE INDEX `idx_gr_recordId` ON `group_records` (`recordId`);--> statement-breakpoint
CREATE INDEX `idx_groups_uuidToken` ON `groups` (`uuidToken`);--> statement-breakpoint
CREATE INDEX `idx_groups_status` ON `groups` (`status`);--> statement-breakpoint
CREATE INDEX `idx_records_panelId` ON `records` (`panelId`);--> statement-breakpoint
CREATE INDEX `idx_records_batchId` ON `records` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_records_createdAt` ON `records` (`createdAt`);
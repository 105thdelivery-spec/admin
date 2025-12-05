-- Create domain_verification table
CREATE TABLE IF NOT EXISTS `domain_verification` (
	`id` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`last_verified_at` datetime NOT NULL,
	`verification_status` varchar(50) DEFAULT 'valid',
	`client_status` varchar(50),
	`subscription_status` varchar(50),
	`subscription_end_date` datetime,
	`verified_by` varchar(255),
	`metadata` json,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `domain_verification_id` PRIMARY KEY(`id`),
	CONSTRAINT `domain_verification_domain_unique` UNIQUE(`domain`)
);

CREATE TABLE `lic_customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policy_no` text NOT NULL,
	`assured_name` text NOT NULL,
	`phone_number` text,
	`area_id` integer,
	`date_of_commencement` text,
	`plan_term` text,
	`mode` text,
	`fup_date` text,
	`flag` text,
	`installment_premium` real,
	`installments_due` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lic_customers_policy_no_unique` ON `lic_customers` (`policy_no`);
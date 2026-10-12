CREATE TABLE `business_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_categories_name_unique` ON `business_categories` (`name`);--> statement-breakpoint
CREATE TABLE `business_contact_numbers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_contact_id` integer NOT NULL,
	`phone_number` text NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`business_contact_id`) REFERENCES `business_contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `business_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category_id` integer NOT NULL,
	`primary_number` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `business_categories`(`id`) ON UPDATE no action ON DELETE no action
);

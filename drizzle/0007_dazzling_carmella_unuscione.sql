CREATE TABLE `lic_ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lic_customer_id` integer NOT NULL,
	`date` text NOT NULL,
	`required_amount` real NOT NULL,
	`amount_paid` real NOT NULL,
	`payment_method` text,
	`notes` text,
	`balance_after` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lic_customer_id`) REFERENCES `lic_customers`(`id`) ON UPDATE no action ON DELETE cascade
);

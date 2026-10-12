CREATE TABLE `stock_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_name` text NOT NULL,
	`serial_number` text NOT NULL,
	`model_number` text NOT NULL,
	`dealer_price` real NOT NULL,
	`billing_date` text NOT NULL,
	`status` text DEFAULT 'In Stock' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_items_serial_number_unique` ON `stock_items` (`serial_number`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`stock_item_id` integer,
	`product_name` text NOT NULL,
	`model_number` text NOT NULL,
	`serial_number` text NOT NULL,
	`purchase_date` text NOT NULL,
	`sale_price` real NOT NULL,
	`next_follow_up_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_serial_number_unique` ON `products` (`serial_number`);
--> statement-breakpoint
CREATE TABLE `product_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`amount_received` real NOT NULL,
	`date_received` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`previous_date` text,
	`new_date` text,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);

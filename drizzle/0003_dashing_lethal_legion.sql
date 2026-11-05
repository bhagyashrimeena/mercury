CREATE TABLE `site_metrics` (
	`day` text NOT NULL,
	`metric` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `metric`),
	CONSTRAINT "site_metrics_count_valid" CHECK("site_metrics"."count" >= 0)
);

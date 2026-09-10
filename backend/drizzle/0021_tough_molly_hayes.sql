ALTER TABLE "config" ALTER COLUMN "data" SET DATA TYPE jsonb USING "data"::jsonb;--> statement-breakpoint
ALTER TABLE "endpoint" ALTER COLUMN "data" SET DATA TYPE jsonb USING "data"::jsonb;--> statement-breakpoint
ALTER TABLE "server" ALTER COLUMN "data" SET DATA TYPE jsonb USING "data"::jsonb;

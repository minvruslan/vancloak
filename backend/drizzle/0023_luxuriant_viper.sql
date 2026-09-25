ALTER TABLE "endpoint" DROP CONSTRAINT "endpoint_server_id_server_id_fk";
--> statement-breakpoint
DROP INDEX "endpoint_server_port_uq";--> statement-breakpoint
DROP INDEX "endpoint_server_protocol_uq";--> statement-breakpoint
DROP INDEX "endpoint_server_idx";--> statement-breakpoint
ALTER TABLE "config" ALTER COLUMN "host" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN "server_id";
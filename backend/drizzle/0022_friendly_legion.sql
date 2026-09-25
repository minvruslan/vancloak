CREATE TABLE "endpoint_placement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"server_id" uuid NOT NULL,
	"host" text,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "placement_id" uuid;--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "host" text;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "host" text;--> statement-breakpoint
ALTER TABLE "endpoint_placement" ADD CONSTRAINT "endpoint_placement_endpoint_id_endpoint_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_placement" ADD CONSTRAINT "endpoint_placement_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "endpoint_placement_endpoint_server_uq" ON "endpoint_placement" USING btree ("endpoint_id","server_id");--> statement-breakpoint
CREATE INDEX "endpoint_placement_endpoint_idx" ON "endpoint_placement" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "endpoint_placement_server_idx" ON "endpoint_placement" USING btree ("server_id");--> statement-breakpoint
ALTER TABLE "config" ADD CONSTRAINT "config_placement_id_endpoint_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."endpoint_placement"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "config_placement_idx" ON "config" USING btree ("placement_id");--> statement-breakpoint
INSERT INTO "endpoint_placement" ("endpoint_id", "server_id") SELECT "id", "server_id" FROM "endpoint";
--> statement-breakpoint
UPDATE "endpoint_placement" SET "data" = jsonb_build_object('actualState', ("endpoint"."data" -> 'actualState') - 'host'::text) FROM "endpoint" WHERE "endpoint"."id" = "endpoint_placement"."endpoint_id" AND jsonb_typeof("endpoint"."data" -> 'actualState') = 'object';
--> statement-breakpoint
UPDATE "config" SET "placement_id" = "endpoint_placement"."id" FROM "endpoint_placement" WHERE "endpoint_placement"."endpoint_id" = "config"."endpoint_id";
--> statement-breakpoint
UPDATE "config" SET "host" = coalesce("config"."data" ->> 'host', "endpoint"."data" -> 'actualState' ->> 'host', "server"."domain_name", "server"."ip") FROM "endpoint" JOIN "server" ON "server"."id" = "endpoint"."server_id" WHERE "endpoint"."id" = "config"."endpoint_id";
--> statement-breakpoint
UPDATE "endpoint" SET "host" = "server"."domain_name" FROM "server" WHERE "server"."id" = "endpoint"."server_id" AND "server"."domain_name" IS NOT NULL AND NOT "server"."is_current";--> statement-breakpoint
UPDATE "endpoint" SET "data" = CASE WHEN jsonb_typeof("data" -> 'desiredState') = 'object' THEN jsonb_build_object('desiredState', ("data" -> 'desiredState') - 'host'::text) ELSE "data" - 'actualState'::text END;

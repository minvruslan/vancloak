ALTER TABLE "protocol" DROP CONSTRAINT "protocol_code_check";--> statement-breakpoint
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_code_check" CHECK ("protocol"."code" in ('amneziawg3'));
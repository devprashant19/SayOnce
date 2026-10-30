-- Facts are numbered per update (f1, f2 ...), so the key is the pair. Keyed on
-- the fact id alone, the second update ever saved collided on "f1".
ALTER TABLE "facts" DROP CONSTRAINT "facts_pkey";--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_update_id_id_pk" PRIMARY KEY("update_id","id");

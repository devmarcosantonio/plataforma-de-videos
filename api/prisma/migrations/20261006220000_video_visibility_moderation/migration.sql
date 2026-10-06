-- Visibilidade (escolha do dono) e status de moderação (decisão da moderação), em campos separados.
CREATE TYPE "video_visibility" AS ENUM ('public', 'private');
CREATE TYPE "video_moderation_status" AS ENUM ('active', 'under_review', 'removed');

ALTER TABLE "videos"
  ADD COLUMN "visibility" "video_visibility" NOT NULL DEFAULT 'private',
  ADD COLUMN "moderation_status" "video_moderation_status" NOT NULL DEFAULT 'active',
  ADD COLUMN "moderated_at" TIMESTAMPTZ(3),
  ADD COLUMN "moderated_by" UUID,
  ADD COLUMN "moderation_reason" "report_reason",
  ADD COLUMN "moderation_note" VARCHAR(500);

-- Os vídeos que já existiam estavam no ar: continuam públicos. Novos nascem privados.
UPDATE "videos" SET "visibility" = 'public';

-- Remoções feitas antes desta migração passam para o novo status.
UPDATE "videos"
SET "moderation_status" = 'removed', "moderated_at" = "removed_at", "moderated_by" = "removed_by", "moderation_note" = "removal_reason"
WHERE "removed_at" IS NOT NULL;

ALTER TABLE "videos" DROP CONSTRAINT "videos_removed_by_fkey";
ALTER TABLE "videos" DROP COLUMN "removed_at", DROP COLUMN "removed_by", DROP COLUMN "removal_reason";

ALTER TABLE "videos" ADD CONSTRAINT "videos_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Em revisão ou removido sempre tem data da decisão.
ALTER TABLE "videos" ADD CONSTRAINT "videos_moderated_has_date" CHECK ("moderation_status" = 'active' OR "moderated_at" IS NOT NULL);

-- Listagens públicas (início, busca): só os públicos e ativos, do mais novo ao mais antigo.
CREATE INDEX "videos_listed_idx" ON "videos"("created_at" DESC) WHERE "visibility" = 'public' AND "moderation_status" = 'active';

-- Denúncias: só vídeos e comentários (canais saem por enquanto).
DELETE FROM "report_cases" WHERE "target_type" = 'user';
ALTER TYPE "report_target_type" RENAME TO "report_target_type_old";
CREATE TYPE "report_target_type" AS ENUM ('video', 'comment');
ALTER TABLE "report_cases" ALTER COLUMN "target_type" TYPE "report_target_type" USING "target_type"::text::"report_target_type";
DROP TYPE "report_target_type_old";

-- Motivo pronto da decisão (quando houve remoção).
ALTER TABLE "report_cases" ADD COLUMN "resolution_reason" "report_reason";

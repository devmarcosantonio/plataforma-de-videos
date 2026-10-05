-- Renomeia "likes" para "reactions" preservando os dados: os likes existentes viram reações do tipo 'like'.
CREATE TYPE "reaction_type" AS ENUM ('like', 'dislike');

ALTER TABLE "likes" RENAME TO "reactions";
ALTER TABLE "reactions" RENAME CONSTRAINT "likes_pkey" TO "reactions_pkey";
ALTER TABLE "reactions" RENAME CONSTRAINT "likes_user_id_fkey" TO "reactions_user_id_fkey";
ALTER TABLE "reactions" RENAME CONSTRAINT "likes_video_id_fkey" TO "reactions_video_id_fkey";

-- Defaults só para preencher as linhas existentes; depois são removidos (o Prisma cuida dos valores).
ALTER TABLE "reactions"
  ADD COLUMN "type" "reaction_type" NOT NULL DEFAULT 'like',
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reactions"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "updated_at" DROP DEFAULT;

DROP INDEX "likes_video_id_idx";
CREATE INDEX "reactions_video_id_type_idx" ON "reactions"("video_id", "type");

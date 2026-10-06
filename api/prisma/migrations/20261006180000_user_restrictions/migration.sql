-- CreateEnum
CREATE TYPE "restriction_type" AS ENUM ('comment', 'upload', 'react', 'suspend', 'ban');

-- A aprovação para publicar passa a ser um pedido aprovado (upload_requests), não mais uma coluna.
-- Quem já podia publicar ganha um pedido aprovado, para não perder o acesso.
INSERT INTO "upload_requests" ("id", "user_id", "message", "status", "review_note", "created_at", "reviewed_at")
SELECT gen_random_uuid(), "id", 'Liberado na migração', 'approved', 'Liberado na migração', now(), now()
FROM "users"
WHERE "can_upload" = true
  AND NOT EXISTS (
    SELECT 1 FROM "upload_requests" r WHERE r."user_id" = "users"."id" AND r."status" = 'approved'
  );

-- AlterTable
ALTER TABLE "users" DROP COLUMN "can_upload";

-- CreateTable
CREATE TABLE "user_restrictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "restriction_type" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by" UUID,
    "revoke_reason" VARCHAR(500),

    CONSTRAINT "user_restrictions_pkey" PRIMARY KEY ("id"),
    -- Banimento é sempre permanente (temporário é suspensão).
    CONSTRAINT "user_restrictions_ban_permanent" CHECK ("type" <> 'ban' OR "expires_at" IS NULL),
    CONSTRAINT "user_restrictions_expires_after_created" CHECK ("expires_at" IS NULL OR "expires_at" > "created_at"),
    CONSTRAINT "user_restrictions_reason_not_blank" CHECK (length(trim("reason")) > 0)
);

-- CreateIndex
CREATE INDEX "user_restrictions_user_id_created_at_idx" ON "user_restrictions"("user_id", "created_at" DESC);

-- Só as não revogadas podem estar ativas: é o que o cálculo de acesso consulta a cada requisição.
CREATE INDEX "user_restrictions_unrevoked_idx" ON "user_restrictions"("user_id", "type") WHERE "revoked_at" IS NULL;

-- Aprovação de publicação: consulta "existe pedido aprovado?" por usuário.
CREATE INDEX "upload_requests_approved_idx" ON "upload_requests"("user_id") WHERE "status" = 'approved';

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

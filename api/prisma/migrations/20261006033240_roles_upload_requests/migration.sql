-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "upload_request_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_upload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "upload_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "portfolio_url" VARCHAR(500),
    "status" "upload_request_status" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "review_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "upload_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "target_user_id" UUID,
    "target_video_id" UUID,
    "target_comment_id" UUID,
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_requests_status_created_at_idx" ON "upload_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "upload_requests_user_id_created_at_idx" ON "upload_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs"("created_at");

-- CreateIndex
CREATE INDEX "moderation_logs_target_user_id_created_at_idx" ON "moderation_logs"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "upload_requests" ADD CONSTRAINT "upload_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_requests" ADD CONSTRAINT "upload_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Só uma solicitação pendente por pessoa (o Prisma não modela índice parcial).
CREATE UNIQUE INDEX "upload_requests_one_pending_per_user" ON "upload_requests"("user_id") WHERE "status" = 'pending';

-- Contagem rápida de notificações não lidas.
CREATE INDEX "notifications_unread_idx" ON "notifications"("user_id") WHERE "read_at" IS NULL;

-- Quem já publicou vídeos continua podendo publicar.
UPDATE "users" SET "can_upload" = true WHERE "id" IN (SELECT DISTINCT "user_id" FROM "videos");

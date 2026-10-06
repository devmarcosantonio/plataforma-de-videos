-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('video', 'comment', 'user');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'harassment', 'hate', 'violence', 'sexual', 'misleading', 'copyright', 'other');

-- CreateEnum
CREATE TYPE "report_case_status" AS ENUM ('open', 'actioned', 'dismissed');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "removal_reason" VARCHAR(500),
ADD COLUMN     "removed_at" TIMESTAMPTZ(3),
ADD COLUMN     "removed_by" UUID;

-- CreateTable
CREATE TABLE "report_cases" (
    "id" UUID NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "target_user_id" UUID,
    "status" "report_case_status" NOT NULL DEFAULT 'open',
    "reports_count" INTEGER NOT NULL DEFAULT 0,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "resolution_note" VARCHAR(500),

    CONSTRAINT "report_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "reporter_id" UUID,
    "reason" "report_reason" NOT NULL,
    "details" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_cases_status_severity_reports_count_created_at_idx" ON "report_cases"("status", "severity" DESC, "reports_count" DESC, "created_at");

-- CreateIndex
CREATE INDEX "report_cases_target_user_id_created_at_idx" ON "report_cases"("target_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_case_id_reporter_id_key" ON "reports"("case_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cases" ADD CONSTRAINT "report_cases_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cases" ADD CONSTRAINT "report_cases_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "report_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Um caso aberto por conteúdo: denúncias novas entram nele. Depois de resolvido, novas denúncias abrem outro caso.
CREATE UNIQUE INDEX "report_cases_one_open_per_target" ON "report_cases"("target_type", "target_id") WHERE "status" = 'open';

-- Contagem nunca negativa; caso resolvido sempre tem data.
ALTER TABLE "report_cases" ADD CONSTRAINT "report_cases_count_not_negative" CHECK ("reports_count" >= 0);
ALTER TABLE "report_cases" ADD CONSTRAINT "report_cases_resolved_has_date" CHECK ("status" = 'open' OR "resolved_at" IS NOT NULL);

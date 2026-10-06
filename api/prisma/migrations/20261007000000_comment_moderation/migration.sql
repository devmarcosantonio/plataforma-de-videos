-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "moderated_at" TIMESTAMPTZ(3),
ADD COLUMN     "moderated_by" UUID,
ADD COLUMN     "moderation_note" VARCHAR(500),
ADD COLUMN     "moderation_reason" "report_reason";

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


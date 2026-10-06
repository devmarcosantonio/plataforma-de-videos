-- CreateTable
CREATE TABLE "watch_history" (
    "user_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "watch_count" INTEGER NOT NULL DEFAULT 1,
    "first_watched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_watched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("user_id","video_id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "history_paused" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "watch_history_user_id_last_watched_at_idx" ON "watch_history"("user_id", "last_watched_at" DESC);

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Posição nunca negativa e contagem mínima de 1 (o Prisma não modela CHECK).
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_position_check" CHECK ("position_seconds" >= 0);
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_count_check" CHECK ("watch_count" >= 1);

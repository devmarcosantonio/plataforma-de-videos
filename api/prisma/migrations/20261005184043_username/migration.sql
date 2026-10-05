-- 1) Coluna opcional para poder preencher os usuários que já existem.
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(30);

-- 2) Preenche a partir do e-mail (parte antes do @), seguindo as regras de formato:
--    minúsculas, só [a-z0-9._], sem "..", começando/terminando sem ponto.
--    Se ficar curto demais usa "user_<id>"; se repetir, recebe sufixo "_2", "_3"...
WITH base AS (
  SELECT
    id,
    created_at,
    trim(both '._' FROM left(
      regexp_replace(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._]', '_', 'g'), '\.{2,}', '.', 'g'),
      24
    )) AS candidate
  FROM "users"
),
fixed AS (
  SELECT
    id,
    created_at,
    CASE WHEN length(candidate) < 3 THEN 'user_' || substr(replace(id::text, '-', ''), 1, 8) ELSE candidate END AS candidate
  FROM base
),
numbered AS (
  SELECT id, candidate, row_number() OVER (PARTITION BY candidate ORDER BY created_at, id) AS n
  FROM fixed
)
UPDATE "users" u
SET "username" = CASE WHEN numbered.n = 1 THEN numbered.candidate ELSE numbered.candidate || '_' || numbered.n END
FROM numbered
WHERE u.id = numbered.id;

-- 3) Agora sim: obrigatório e único.
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

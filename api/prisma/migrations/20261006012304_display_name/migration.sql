-- Troca nome + sobrenome por um único "nome de exibição", preservando os nomes atuais.
ALTER TABLE "users" ADD COLUMN "display_name" VARCHAR(50);

UPDATE "users" SET "display_name" = left(trim(concat_ws(' ', "name", "last_name")), 50);
-- Garantia: se algum ficar vazio, usa o username.
UPDATE "users" SET "display_name" = "username" WHERE coalesce("display_name", '') = '';

ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "name", DROP COLUMN "last_name";

// Confere se todos os idiomas têm as mesmas chaves que o português (idioma de referência).
// Uso: npm run i18n:check
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "../messages");
const reference = "pt-BR.json";

function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const read = (file) => new Set(flatten(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))));
const base = read(reference);
let ok = true;

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json") && name !== reference)) {
  const keys = read(file);
  const missing = [...base].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !base.has(key));
  if (missing.length || extra.length) {
    ok = false;
    console.error(`✗ ${file}`);
    if (missing.length) console.error(`  faltando: ${missing.join(", ")}`);
    if (extra.length) console.error(`  sobrando: ${extra.join(", ")}`);
  } else {
    console.log(`✓ ${file} (${keys.size} chaves)`);
  }
}

process.exit(ok ? 0 : 1);

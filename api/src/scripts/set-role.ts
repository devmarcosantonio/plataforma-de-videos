// Define o papel de um usuário pelo terminal (é assim que se cria o primeiro admin).
// Uso: npm run user:role -- <username|email> <user|moderator|admin>
import { prisma } from '../config/database.js';
import { ModerationModel } from '../models/moderation.model.js';
import { UserModel } from '../models/user.model.js';

const ROLES = ['user', 'moderator', 'admin'] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const [identifier, role] = process.argv.slice(2);
  if (!identifier || !ROLES.includes(role as Role)) {
    console.error('Uso: npm run user:role -- <username|email> <user|moderator|admin>');
    process.exitCode = 1;
    return;
  }

  const user = identifier.includes('@') && !identifier.startsWith('@')
    ? await UserModel.findByEmail(identifier.toLowerCase())
    : await UserModel.findByUsername(identifier.replace(/^@/, '').toLowerCase());
  if (!user) {
    console.error(`Usuário não encontrado: ${identifier}`);
    process.exitCode = 1;
    return;
  }

  if (user.role === role) {
    console.log(`@${user.username} já é ${role}.`);
    return;
  }

  // Sem autor (actor_id nulo): no log aparece como alteração feita pelo sistema.
  await ModerationModel.changeRole(null, user, role as Role);
  console.log(`@${user.username}: ${user.role} → ${role}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

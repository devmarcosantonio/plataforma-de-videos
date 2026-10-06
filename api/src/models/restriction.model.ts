import { z } from 'zod';
import { prisma } from '../config/database.js';
import type { Prisma, RestrictionType, User, UserRestriction } from '../generated/prisma/client.js';
import { ModerationModel } from './moderation.model.js';
import { NotificationModel } from './notification.model.js';

export type { RestrictionType, UserRestriction };

export const RESTRICTION_TYPES = ['comment', 'upload', 'react', 'suspend', 'ban'] as const satisfies readonly RestrictionType[];

// Prazos oferecidos no painel. "permanent" e "ban" exigem admin (conferido no service).
export const DURATIONS = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  permanent: null,
} as const;
export type Duration = keyof typeof DURATIONS;

const reason = z
  .string({ error: 'REVIEW_NOTE_REQUIRED' })
  .trim()
  .min(1, 'REVIEW_NOTE_REQUIRED')
  .max(500, 'REVIEW_NOTE_TOO_LONG');

export const applyRestrictionSchema = z.object({
  types: z
    .array(z.enum(RESTRICTION_TYPES, { error: 'RESTRICTION_TYPE_INVALID' }), { error: 'RESTRICTION_TYPES_REQUIRED' })
    .min(1, 'RESTRICTION_TYPES_REQUIRED')
    .transform((types) => [...new Set(types)]),
  duration: z.enum(Object.keys(DURATIONS) as [Duration, ...Duration[]], { error: 'RESTRICTION_DURATION_INVALID' }),
  reason,
});

export const revokeRestrictionSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'REVIEW_NOTE_TOO_LONG')
    .optional()
    .transform((value) => value || undefined),
});

// Ativa = não revogada e dentro do prazo. Vencer não muda nada no banco: só deixa de entrar aqui.
export function activeWhere(now = new Date()): Prisma.UserRestrictionWhereInput {
  return { revoked_at: null, OR: [{ expires_at: null }, { expires_at: { gt: now } }] };
}

// Banimento é sempre permanente (CHECK no banco): não revogado = ativo.
// Usado para ocultar o conteúdo de quem foi banido nas listagens.
export const bannedUser: Prisma.UserWhereInput = { restrictions: { some: { type: 'ban', revoked_at: null } } };

const person = { select: { id: true, username: true, display_name: true } } as const;

export const RestrictionModel = {
  async active(userId: string): Promise<UserRestriction[]> {
    return prisma.userRestriction.findMany({
      where: { user_id: userId, ...activeWhere() },
      orderBy: { created_at: 'desc' },
    });
  },

  async findById(id: string): Promise<UserRestriction | null> {
    return prisma.userRestriction.findUnique({ where: { id } });
  },

  // Histórico completo de uma pessoa (ativas, vencidas e revogadas), para a página de detalhes.
  async listByUser(userId: string) {
    return prisma.userRestriction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 100,
      include: { author: person, revoker: person },
    });
  },

  // Aplica uma ou mais restrições de uma vez, com log e notificação na mesma transação.
  async apply(
    actor: User,
    target: User,
    types: RestrictionType[],
    expiresAt: Date | null,
    reason: string,
  ): Promise<UserRestriction[]> {
    return prisma.$transaction(async (tx) => {
      const created: UserRestriction[] = [];
      for (const type of types) {
        created.push(
          await tx.userRestriction.create({
            data: { user_id: target.id, type, reason, expires_at: expiresAt, created_by: actor.id },
          }),
        );
      }
      const until = expiresAt?.toISOString() ?? null;
      await ModerationModel.log(
        {
          actor_id: actor.id,
          action: 'restriction.apply',
          target_user_id: target.id,
          reason,
          metadata: { types, expires_at: until, restriction_ids: created.map((item) => item.id) },
        },
        tx,
      );
      await NotificationModel.createMany(
        [{ user_id: target.id, type: 'restriction.applied', data: { types, until, reason } }],
        tx,
      );
      return created;
    });
  },

  async revoke(actor: User, restriction: UserRestriction, reason: string | undefined): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Só revoga se ainda não foi revogada (duas pessoas ao mesmo tempo: uma só vence).
      const { count } = await tx.userRestriction.updateMany({
        where: { id: restriction.id, revoked_at: null },
        data: { revoked_at: new Date(), revoked_by: actor.id, revoke_reason: reason ?? null },
      });
      if (count === 0) throw new Error('ALREADY_REVOKED');

      await ModerationModel.log(
        {
          actor_id: actor.id,
          action: 'restriction.revoke',
          target_user_id: restriction.user_id,
          reason,
          metadata: { restriction_id: restriction.id, type: restriction.type },
        },
        tx,
      );
      await NotificationModel.createMany(
        [{ user_id: restriction.user_id, type: 'restriction.revoked', data: { type: restriction.type } }],
        tx,
      );
    });
  },
};

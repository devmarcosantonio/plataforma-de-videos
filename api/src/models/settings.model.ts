import { z } from 'zod';
import { prisma } from '../config/database.js';

export interface Settings {
  history_paused: boolean;
}

// Padrões de quem nunca mudou nada (não existe linha em user_settings).
const DEFAULTS: Settings = { history_paused: false };

export const updateSettingsSchema = z.object({
  history_paused: z.boolean({ error: 'INVALID_VALUE' }).optional(),
});

export const SettingsModel = {
  async get(userId: string): Promise<Settings> {
    const row = await prisma.userSettings.findUnique({ where: { user_id: userId } });
    return row ? { history_paused: row.history_paused } : DEFAULTS;
  },

  async update(userId: string, data: Partial<Settings>): Promise<Settings> {
    const row = await prisma.userSettings.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...DEFAULTS, ...data },
      update: data,
    });
    return { history_paused: row.history_paused };
  },
};

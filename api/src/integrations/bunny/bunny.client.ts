import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors/app-error.js';
import type { BunnyVideo } from './bunny.types.js';

const BASE_URL = `https://video.bunnycdn.com/library/${env.BUNNY_LIBRARY_ID}`;
const TIMEOUT_MS = 10_000;

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        AccessKey: env.BUNNY_API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Falha de rede ao chamar o Bunny:', error);
    throw new AppError('Falha ao comunicar com o provedor de vídeo', 502);
  }
}

async function fail(response: Response): Promise<never> {
  console.error(`Bunny respondeu ${response.status}:`, await response.text());
  throw new AppError('Falha ao comunicar com o provedor de vídeo', 502);
}

export const bunnyClient = {
  async createVideo(title: string): Promise<BunnyVideo> {
    const response = await request('/videos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (!response.ok) return fail(response);
    return response.json() as Promise<BunnyVideo>;
  },

  async getVideo(videoId: string): Promise<BunnyVideo | null> {
    const response = await request(`/videos/${encodeURIComponent(videoId)}`);
    if (response.status === 404) return null;
    if (!response.ok) return fail(response);
    return response.json() as Promise<BunnyVideo>;
  },

  async deleteVideo(videoId: string): Promise<void> {
    const response = await request(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
    // 404 significa que já não existe no Bunny, o que é o resultado desejado.
    if (!response.ok && response.status !== 404) return fail(response);
  },
};

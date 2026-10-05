import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import type { BunnyUploadCredentials } from './bunny.types.js';

const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';
const UPLOAD_TTL_SECONDS = 60 * 60;
const PLAYBACK_TTL_SECONDS = 60 * 60;

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');
const nowInSeconds = () => Math.floor(Date.now() / 1000);

// Credenciais para o front enviar o arquivo direto ao Bunny via TUS.
// Assinatura: SHA256(library_id + api_key + expiration_time + video_id)
export function createUploadCredentials(videoId: string): BunnyUploadCredentials {
  const expires = nowInSeconds() + UPLOAD_TTL_SECONDS;
  const signature = sha256Hex(`${env.BUNNY_LIBRARY_ID}${env.BUNNY_API_KEY}${expires}${videoId}`);

  return {
    endpoint: TUS_ENDPOINT,
    headers: {
      AuthorizationSignature: signature,
      AuthorizationExpire: String(expires),
      VideoId: videoId,
      LibraryId: env.BUNNY_LIBRARY_ID,
    },
    expires_at: new Date(expires * 1000).toISOString(),
  };
}

// URL do player. Se a autenticação por token estiver ativa, assina com
// SHA256(token_auth_key + video_id + expiration).
export function createEmbedUrl(videoId: string): { url: string; expires_at: string | null } {
  const url = new URL(`https://player.mediadelivery.net/embed/${env.BUNNY_LIBRARY_ID}/${videoId}`);

  if (!env.BUNNY_TOKEN_AUTH_KEY) return { url: url.toString(), expires_at: null };

  const expires = nowInSeconds() + PLAYBACK_TTL_SECONDS;
  url.searchParams.set('token', sha256Hex(`${env.BUNNY_TOKEN_AUTH_KEY}${videoId}${expires}`));
  url.searchParams.set('expires', String(expires));
  return { url: url.toString(), expires_at: new Date(expires * 1000).toISOString() };
}

// Webhooks são assinados com HMAC-SHA256(raw_body, read_only_api_key) em hex minúsculo.
export function isValidWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
): boolean {
  const signature = headers['x-bunnystream-signature'];
  if (headers['x-bunnystream-signature-version'] !== 'v1') return false;
  if (headers['x-bunnystream-signature-algorithm'] !== 'hmac-sha256') return false;
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return false;

  const expected = createHmac('sha256', env.BUNNY_READ_ONLY_API_KEY).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

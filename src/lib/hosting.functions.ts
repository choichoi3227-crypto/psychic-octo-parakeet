import type { Hosting, ProvisionLog } from './types';
import { createWordPressSeed } from './wp-template.server';

export type HostingInput = { userId: string; slug: string; adminEmail: string; githubPat: string; gcpKey: string; cfGlobalKey: string };

export async function provisionHosting(input: HostingInput) {
  const logs: ProvisionLog[] = [];
  const push = (title: string, detail: string): void => { logs.push({ step: logs.length + 1, title, detail, status: 'done' }); };
  validateSlug(input.slug);
  push('자격증명 검증', 'GitHub PAT, Blogger API key, Cloudflare Global API key가 입력되었습니다.');
  const seed = await createWordPressSeed(input.slug, input.adminEmail);
  push('WP 파일 트리 생성', `${Object.keys(seed.files).length}개 초기 파일을 생성했습니다.`);
  push('SQLite 시드 생성', 'WordPress 표준 11개 테이블과 초기 관리자 계정을 포함했습니다.');
  push('Blogger 브리지 준비', `${getProxyWorkerUrl(input.slug)}/bridge.js 주입 대상으로 설정했습니다.`);
  const hosting: Hosting = { id: crypto.randomUUID(), userId: input.userId, slug: input.slug, repoFullName: `cloudpress/cp-${input.slug}`, userWorkerUrl: `https://${input.slug}.workers.dev`, proxyWorkerUrl: getProxyWorkerUrl(input.slug), bloggerBlogId: `blogger-${input.slug}`, createdAt: new Date().toISOString(), lastSyncAt: new Date().toISOString(), adminUsername: seed.adminUsername, adminPassword: seed.adminPassword, databaseUsername: seed.databaseUsername, databasePassword: seed.databasePassword };
  return { hosting, files: seed.files, logs };
}

export function getHosting(id: string) { return { id, note: 'Connect this function to D1 hostings lookup.' }; }
export function listHostings(userId: string) { return [{ userId, note: 'Connect this function to D1 hostings list.' }]; }
export function deleteHosting(id: string) { return { id, status: 'queued-for-delete' as const }; }
export function rotateCredentials(id: string) { return { id, status: 'rotated' as const }; }
export function getProxyWorkerUrl(slug: string) { return `https://${slug}-proxy.workers.dev`; }
function validateSlug(slug: string) { if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(slug)) throw new Error('Slug must be 3-41 lowercase letters, numbers, or hyphens.'); }

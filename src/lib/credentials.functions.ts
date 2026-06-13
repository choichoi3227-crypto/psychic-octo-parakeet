import { encryptJson } from './security';
export type Credentials = { githubPat: string; gcpKey: string; cfGlobalKey: string };
export function validateCredentials(credentials: Credentials) { return { github: credentials.githubPat.startsWith('gh'), blogger: credentials.gcpKey.length > 10, cloudflare: credentials.cfGlobalKey.length > 10 }; }
export async function storeCredentials(userId: string, secret: CryptoKey, credentials: Credentials) { return { key: `cred:${userId}`, value: await encryptJson(secret, credentials) }; }

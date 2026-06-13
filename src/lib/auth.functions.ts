import { sha256 } from './security';
export async function register(email: string, password: string) { return { id: crypto.randomUUID(), email, passwordHash: await sha256(password), createdAt: new Date().toISOString() }; }
export async function login(email: string, password: string) { return { accessToken: await sha256(`${email}:${password}:${Date.now()}`), refreshJti: crypto.randomUUID(), expiresIn: 900 }; }
export async function refresh(refreshJti: string) { return { accessToken: await sha256(`${refreshJti}:${Date.now()}`), refreshJti: crypto.randomUUID(), expiresIn: 900 }; }

// Shared request validation and store-scoping helpers for the Telecom and Inventory modules.
import { one } from './db';
import { HttpError, id, money } from './http';
import type { Claims } from './jwt';

export type Query = (name: string) => string | undefined;
export const MAX_HALALAS = 9_999_999_999;

export function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[], label = 'field') {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) throw new HttpError(400, `Unknown ${label}: ${key}`);
}
export function optionalText(value: unknown, name: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || new TextEncoder().encode(value).length > max) throw new HttpError(400, `Invalid ${name}`);
  return value.trim() || null;
}
export function requiredText(value: unknown, name: string, max: number): string {
  const text = optionalText(value, name, max);
  if (!text) throw new HttpError(400, `${name} is required`);
  return text;
}
/** SAR amount (number or numeric string, max 2 decimals) to integer halalas. */
export function sar(value: unknown, name: string): number {
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `Invalid ${name}`);
  let halalas: number;
  try { halalas = money(value); } catch { throw new HttpError(400, `Invalid ${name}`); }
  if (halalas > MAX_HALALAS) throw new HttpError(400, `${name} exceeds the money limit`);
  return halalas;
}
export function oneOf<T extends string>(value: unknown, name: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value.toUpperCase() as T)) throw new HttpError(400, `${name} must be one of ${allowed.join(', ')}`);
  return value.toUpperCase() as T;
}
export function optionalId(value: unknown, name: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `Invalid ${name}`);
  try { return id(String(value)); } catch { throw new HttpError(400, `Invalid ${name}`); }
}
export function requiredId(value: unknown, name: string): number {
  const result = optionalId(value, name);
  if (result === undefined || result === null) throw new HttpError(400, `${name} is required`);
  return result;
}
export function intInRange(value: unknown, name: string, min: number, max: number): number {
  const n = typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be an integer between ${min} and ${max}`);
  return n;
}
export function bool(value: unknown, name: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new HttpError(400, `${name} must be true or false`);
}
export function queryFlag(query: Query, name: string): boolean | undefined {
  const value = query(name);
  if (value === undefined || value === '') return undefined;
  return bool(value, name);
}
export function pageQuery(query: Query, defaultLimit = 20, maxLimit = 100) {
  const pageText = query('page') ?? '1', limitText = query('limit') ?? String(defaultLimit);
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) throw new HttpError(400, 'Invalid pagination');
  const page = Number(pageText), limit = Number(limitText);
  if (page < 1 || limit < 1 || limit > maxLimit) throw new HttpError(400, 'Invalid pagination');
  return { page, limit, offset: (page - 1) * limit };
}
/** Lower-cased, LIKE-escaped `%term%` pattern. Use with ESCAPE '\'. */
export function likePattern(search: string): string {
  if (new TextEncoder().encode(search).length > 50) throw new HttpError(400, 'Invalid search');
  return `%${search.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
}
/**
 * Store restriction for the acting admin. SUPER_ADMIN and admins without an assigned
 * store are unrestricted (null). Admins assigned to a store are limited to it.
 */
export async function actorStore(db: D1Database, claims: Claims): Promise<number | null> {
  if (claims.role === 'SUPER_ADMIN') return null;
  const actor = await one<{ store_id: number | null }>(db.prepare('SELECT store_id FROM admin_users WHERE id=?').bind(claims.sub));
  return actor?.store_id ?? null;
}

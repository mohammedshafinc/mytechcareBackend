export interface Env {
  DB: D1Database;
  APP_ENV: string;
  ALLOWED_ORIGINS: string;
  COOKIE_DOMAIN: string;
  COOKIE_SAME_SITE: string;
  BUSINESS_TIME_ZONE: string;
  REPORT_DEFAULT_DAYS: string;
  REPORT_MAX_DAYS: string;
  SELLER_NAME: string;
  SELLER_VAT_NUMBER: string;
  SELLER_CR_NUMBER: string;
  SELLER_ADDRESS: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  RATE_LIMIT_HMAC_SECRET: string;
  BOOTSTRAP_TOKEN?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  BOOTSTRAP_ADMIN_PASSWORD?: string;
}

export interface Config extends Env { origins: ReadonlySet<string>; reportDefaultDays: number; reportMaxDays: number }

export function parseEnv(env: Env): Config {
  if (!env.DB || !env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET || !env.RATE_LIMIT_HMAC_SECRET) throw new Error('configuration_unavailable');
  if (!['local', 'staging', 'production'].includes(env.APP_ENV)) throw new Error('configuration_unavailable');
  if ([env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.RATE_LIMIT_HMAC_SECRET].some((v) => new TextEncoder().encode(v).length < 32)) throw new Error('configuration_unavailable');
  if (env.BUSINESS_TIME_ZONE !== 'Asia/Riyadh' || env.COOKIE_DOMAIN !== '') throw new Error('configuration_unavailable');
  const sellerValues = [env.SELLER_NAME, env.SELLER_VAT_NUMBER, env.SELLER_CR_NUMBER, env.SELLER_ADDRESS];
  if (sellerValues.some((value) => typeof value !== 'string' || !value.trim() || value.length > 255 || /REPLACE_WITH|PLACEHOLDER/i.test(value))) throw new Error('configuration_unavailable');
  const values = env.ALLOWED_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean);
  const origins = new Set<string>();
  for (const value of values) {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.origin !== value || u.username || u.password || origins.has(value)) throw new Error('configuration_unavailable');
    if (env.APP_ENV === 'production' && !(u.hostname === 'mtechcare.com' || u.hostname.endsWith('.mtechcare.com'))) throw new Error('configuration_unavailable');
    origins.add(value);
  }
  if (!origins.size || (env.APP_ENV === 'production' && (env.COOKIE_DOMAIN !== '' || env.COOKIE_SAME_SITE !== 'Lax'))) throw new Error('configuration_unavailable');
  const reportDefaultDays = Number(env.REPORT_DEFAULT_DAYS);
  const reportMaxDays = Number(env.REPORT_MAX_DAYS);
  if (!Number.isInteger(reportDefaultDays) || !Number.isInteger(reportMaxDays) || reportDefaultDays < 1 || reportMaxDays > 366 || reportDefaultDays > reportMaxDays) throw new Error('configuration_unavailable');
  return Object.assign(env, { origins, reportDefaultDays, reportMaxDays });
}

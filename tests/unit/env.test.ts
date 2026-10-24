import { describe,expect,it } from 'vitest';
import { parseEnv,type Env } from '../../src/worker/env';
const base={DB:{} as D1Database,APP_ENV:'production',ALLOWED_ORIGINS:'https://app.mtechcare.com',COOKIE_DOMAIN:'',COOKIE_SAME_SITE:'Lax',BUSINESS_TIME_ZONE:'Asia/Riyadh',REPORT_DEFAULT_DAYS:'30',REPORT_MAX_DAYS:'366',SELLER_NAME:'Example',SELLER_VAT_NUMBER:'000',SELLER_CR_NUMBER:'000',SELLER_ADDRESS:'Example',JWT_ACCESS_SECRET:'a'.repeat(32),JWT_REFRESH_SECRET:'b'.repeat(32),RATE_LIMIT_HMAC_SECRET:'c'.repeat(32)} as Env;
describe('environment',()=>{
  it('accepts exact same-site production origin',()=>expect(parseEnv({...base}).origins.has('https://app.mtechcare.com')).toBe(true));
  it('rejects wildcard and vercel-only production origin',()=>{expect(()=>parseEnv({...base,ALLOWED_ORIGINS:'*'})).toThrow();expect(()=>parseEnv({...base,ALLOWED_ORIGINS:'https://x.vercel.app'})).toThrow();});
  it('allows plain-HTTP loopback origins only outside production',()=>{
    const staging={...base,APP_ENV:'staging',COOKIE_SAME_SITE:'None'};
    expect(parseEnv({...staging,ALLOWED_ORIGINS:'https://admin.mtechcare.com,http://localhost:3000'}).origins.has('http://localhost:3000')).toBe(true);
    expect(parseEnv({...staging,ALLOWED_ORIGINS:'http://127.0.0.1:5173'}).origins.has('http://127.0.0.1:5173')).toBe(true);
    expect(()=>parseEnv({...staging,ALLOWED_ORIGINS:'http://evil.example'})).toThrow();
    expect(()=>parseEnv({...base,ALLOWED_ORIGINS:'https://app.mtechcare.com,http://localhost:3000'})).toThrow();
  });
  it('allows SameSite None or Lax in production and rejects anything else',()=>{
    expect(parseEnv({...base,COOKIE_SAME_SITE:'None'}).COOKIE_SAME_SITE).toBe('None');
    expect(parseEnv({...base,COOKIE_SAME_SITE:'Lax'}).COOKIE_SAME_SITE).toBe('Lax');
    for(const value of ['Strict','none','','Lax; Domain=x'])expect(()=>parseEnv({...base,COOKIE_SAME_SITE:value}),value).toThrow();
  });
  it('rejects unknown environments, non-host-only cookies, and missing or placeholder seller identity',()=>{
    expect(()=>parseEnv({...base,APP_ENV:'prodution'})).toThrow();
    expect(()=>parseEnv({...base,COOKIE_DOMAIN:'.mtechcare.com'})).toThrow();
    for(const patch of [{SELLER_NAME:''},{SELLER_VAT_NUMBER:'REPLACE_WITH_SELLER_VAT_NUMBER'},{SELLER_CR_NUMBER:'placeholder'},{SELLER_ADDRESS:undefined as unknown as string}])expect(()=>parseEnv({...base,...patch})).toThrow();
  });
});

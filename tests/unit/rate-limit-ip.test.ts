import { describe,expect,it } from 'vitest';
import { canonicalIp } from '../../src/worker/rate-limit';

describe('rate-limit IP canonicalization',()=>{
  it('canonicalizes equivalent IPv6 spellings to one key input',()=>{
    const aliases=['2001:0db8:0000:0000:0000:ff00:0042:8329','2001:db8::ff00:42:8329','2001:db8:0:0:0:ff00:42:8329'];
    expect(new Set(aliases.map(canonicalIp))).toEqual(new Set(['2001:db8::ff00:42:8329']));
    expect(canonicalIp('0:0:0:0:0:ffff:192.0.2.128')).toBe('::ffff:c000:280');
    expect(canonicalIp('::ffff:c000:0280')).toBe('::ffff:c000:280');
  });
  it('sends malformed, ambiguous, zoned, and forwarded values to unknown',()=>{
    for(const value of ['2001:::1','1:2:3','gggg::1','fe80::1%eth0','2001:db8::1, 192.0.2.1',' 2001:db8::1','999.1.1.1'])expect(canonicalIp(value)).toBe('unknown');
  });
});

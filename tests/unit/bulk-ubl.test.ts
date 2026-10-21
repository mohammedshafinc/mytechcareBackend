import { describe,expect,it } from 'vitest';
import { chunkRows } from '../../src/worker/bulk';
import { qrTlv,sha256,xmlEscape } from '../../src/worker/ubl';
describe('D1 bulk and invoice bytes',()=>{it('chunks 100 invoice and job rows under 100 binds',()=>{expect(chunkRows(Array(100).fill(0),1,6).map(x=>x.length)).toEqual([16,16,16,16,16,16,4]);expect(chunkRows(Array(100).fill(0),1,4).map(x=>x.length)).toEqual([24,24,24,24,4]);});it('escapes XML and emits deterministic TLV/hash',async()=>{expect(xmlEscape('<&>')).toBe('&lt;&amp;&gt;');expect(qrTlv(['A'])).toBe('AQFB');expect(await sha256('fixture')).toBe('8W0F7GspJI0sYa2x6SY/eOT3us4blVAUotF4cs/kBk0=');});});

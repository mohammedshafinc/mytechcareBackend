import { describe,expect,it } from 'vitest';
import worker from '../../src/worker';
describe('runtime graph',()=>it('exports fetch and scheduled handlers',()=>{expect(worker.fetch).toBeTypeOf('function');expect(worker.scheduled).toBeTypeOf('function');}));

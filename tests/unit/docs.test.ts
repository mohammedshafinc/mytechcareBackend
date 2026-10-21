import { describe,expect,it } from 'vitest';
import { openapi } from '../../src/worker/openapi';
describe('documentation',()=>it('publishes the complete OpenAPI 3 route inventory',()=>{expect(openapi.openapi).toBe('3.1.0');expect(Object.keys(openapi.paths).length).toBeGreaterThan(70);}));

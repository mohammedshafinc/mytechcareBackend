import { app } from './worker/app';
import { runDailyExpiry } from './worker/expiry';
import type { Env } from './worker/env';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return Promise.resolve(app.fetch(request, env, ctx));
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(runDailyExpiry(env, controller.scheduledTime).then(result => {
      console.log(JSON.stringify({job:'staff-expiry',businessDate:result.businessDate,outcome:result.state,alertCount:'alertCount' in result?result.alertCount:undefined}));
    }).catch(() => {
      console.error(JSON.stringify({job:'staff-expiry',outcome:'failed'}));
    }));
  }
};

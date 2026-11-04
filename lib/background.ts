import {AsyncLocalStorage} from 'node:async_hooks';
const context=new AsyncLocalStorage<{waitUntil(promise:Promise<unknown>):void}>();
export function runWithBackgroundTasks<T>(ctx:{waitUntil(promise:Promise<unknown>):void},run:()=>T):T{return context.run(ctx,run);}
export async function backgroundTask(run:()=>Promise<unknown>){const work=Promise.resolve().then(run).catch(()=>{console.error('LINE background notification failed; inspect the staff notification queue.');});const ctx=context.getStore();if(ctx){try{ctx.waitUntil(work);}catch{await work;}}else await work;}

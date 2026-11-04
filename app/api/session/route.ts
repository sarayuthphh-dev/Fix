import {resolveActor,memberships,isStaff,authConfig,provider,readCookie,setCookie} from '../../../lib/auth';
import {json,failure} from '../../../lib/http';
export async function GET(request:Request){try{
 let actor=await resolveActor(request);const cookies:string[]=[];
 if(!actor&&readCookie(request,'refresh')&&authConfig()){
  const res=await provider('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:readCookie(request,'refresh')})});
  if(res.ok){const d=await res.json() as {access_token:string;refresh_token:string;expires_in:number};const nextHeaders=new Headers();request.headers.forEach((value,key)=>nextHeaders.set(key,value));nextHeaders.set('cookie',(request.headers.get('cookie')||'').replace(/(?:__Host-)?cad_access=[^;]*/g,'')+'; '+setCookie(request,'access',d.access_token,d.expires_in).split(';')[0]);const next=new Request(request.url,{method:'GET',headers:nextHeaders});actor=await resolveActor(next);if(actor){cookies.push(setCookie(request,'access',d.access_token,d.expires_in),setCookie(request,'refresh',d.refresh_token,604800));}}
 }
 const response=json({user:actor,cooperatives:actor&&!isStaff(actor)?await memberships(actor.email):[],emailLoginReady:!!authConfig()});for(const cookie of cookies)response.headers.append('Set-Cookie',cookie);return response;
}catch(e){return failure(e);}}
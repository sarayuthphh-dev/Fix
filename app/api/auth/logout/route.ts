import {readCookie,setCookie,provider,authConfig} from '../../../../lib/auth';
import {json,sameOrigin} from '../../../../lib/http';
export async function POST(request:Request){if(!sameOrigin(request))return json({error:'ไม่อนุญาตคำขอนี้'},403);const token=readCookie(request,'access');if(token&&authConfig()){try{await provider('/logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+token}});}catch{}}const response=json({ok:true});for(const name of ['access','refresh','pkce'])response.headers.append('Set-Cookie',setCookie(request,name,'',0));return response;}

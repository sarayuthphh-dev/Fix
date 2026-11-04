import {provider,readCookie,setCookie,memberships,authConfig} from '../../../lib/auth';
export async function GET(request:Request){const result=(error?:string)=>new Response(null,{status:303,headers:{Location:error?'/?auth_error='+error:'/','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':setCookie(request,'pkce','',0)}});try{
 const code=new URL(request.url).searchParams.get('code');const verifier=readCookie(request,'pkce');if(!code||code.length>500||!verifier||!authConfig())return result('expired');
 const res=await provider('/token?grant_type=pkce',{method:'POST',body:JSON.stringify({auth_code:code,code_verifier:verifier})});if(!res.ok)return result('expired');
 const d=await res.json() as {access_token:string;refresh_token:string;expires_in:number;user:{email?:string;email_confirmed_at?:string}};
 if(!d.access_token||!d.refresh_token||!d.user.email||!d.user.email_confirmed_at||!(await memberships(d.user.email.toLowerCase())).length)return result('not-approved');
 const response=result();response.headers.append('Set-Cookie',setCookie(request,'access',d.access_token,d.expires_in));response.headers.append('Set-Cookie',setCookie(request,'refresh',d.refresh_token,604800));return response;
}catch{return result('unavailable');}}

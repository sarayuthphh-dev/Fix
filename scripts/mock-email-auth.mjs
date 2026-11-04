// Local QA fixture only. Never used by the deployed Worker or for sending email.
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
const users=new Map();const flows=new Map();
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:8899');let body='';for await(const chunk of req)body+=chunk;if(body.length>20000){res.writeHead(413);res.end();return;}const data=body?JSON.parse(body):{};const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 if(url.pathname==='/qa/users'&&req.method==='POST'){const u={id:randomUUID(),email:data.email,email_confirmed_at:data.confirmed===false?null:new Date().toISOString(),access_token:'qa-access-'+randomUUID(),refresh_token:'qa-refresh-'+randomUUID()};users.set(u.email,u);return send(200,u);}
 if(url.pathname==='/qa/flow'){return send(200,flows.get(url.searchParams.get('email'))||{});}
 if(url.pathname==='/auth/v1/user'){const token=req.headers.authorization?.replace('Bearer ','');const user=[...users.values()].find(u=>u.access_token===token);return user?send(200,user):send(401,{error:'invalid-token'});}
 if(url.pathname==='/auth/v1/otp'){const u=users.get(data.email);if(!u)return send(400,{error:'test-user-missing'});const flow={email:data.email,code:randomUUID(),challenge:data.code_challenge,method:data.code_challenge_method,used:false};flows.set(data.email,flow);return send(200,{});}
 if(url.pathname==='/auth/v1/token'){
  if(url.searchParams.get('grant_type')==='refresh_token'){const u=[...users.values()].find(u=>u.refresh_token===data.refresh_token);return u?send(200,{...u,user:u,expires_in:3600}):send(400,{error:'invalid-refresh'});}
  const f=[...flows.values()].find(f=>f.code===data.auth_code);const hash=createHash('sha256').update(data.code_verifier||'').digest('base64url');if(!f||f.used||f.challenge!==hash||f.method!=='s256')return send(400,{error:'invalid-code-or-verifier'});f.used=true;const u=users.get(f.email);return send(200,{...u,user:u,expires_in:3600});
 }
 if(url.pathname==='/auth/v1/logout')return send(200,{});
 return send(404,{error:'not-found'});
}catch{res.writeHead(500);res.end();}});
server.listen(8899,'127.0.0.1',()=>console.log('Local mock email-auth service ready on 127.0.0.1:8899; no emails are sent.'));

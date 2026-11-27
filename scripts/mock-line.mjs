// Local-only QA service. Does not contact LINE or deliver real messages.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
const token='qa-line-access-token-not-real';const accepted=new Map();const calls=[];let mode='ok';
http.createServer(async(req,res)=>{try{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};const url=new URL(req.url,'http://127.0.0.1:8898');const send=(status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(JSON.stringify(data));};
 if(url.pathname==='/qa/state')return send(200,{mode,calls,accepted:[...accepted.values()]});
 if(url.pathname==='/qa/mode'){mode=body.mode;return send(200,{ok:true});}
 if(req.headers.authorization!=='Bearer '+token)return send(401,{message:'invalid test token'});
 if(url.pathname==='/v2/bot/info')return send(200,{userId:'U'+'d'.repeat(32),displayName:'CAD Support QA',basicId:'@qa-only'});
 if(/^\/v2\/bot\/group\/C[a-f0-9]{32}\/summary$/.test(url.pathname))return send(200,{groupId:url.pathname.split('/')[4],groupName:'กลุ่มเจ้าหน้าที่ทดสอบ'});
 if(/^\/v2\/bot\/profile\/U[a-f0-9]{32}$/.test(url.pathname))return send(200,{userId:url.pathname.split('/').at(-1),displayName:'เจ้าหน้าที่ทดสอบแชทส่วนตัว'});
 if(url.pathname==='/v2/bot/message/push'){
  const key=req.headers['x-line-retry-key'];if(!key||! /^[UC][a-f0-9]{32}$/.test(body.to)||body.messages?.[0]?.type!=='text')return send(400,{message:'invalid request'});
  calls.push({key,to:body.to,text:body.messages[0].text,mode});const old=accepted.get(key);if(old){if(old.to!==body.to||old.text!==body.messages[0].text)return send(400,{message:'retry payload changed'});return send(409,{message:'already accepted'},{'x-line-accepted-request-id':old.id});}
  if(mode==='500')return send(500,{message:'simulated outage'});if(mode==='429')return send(429,{message:'simulated quota'});
  const item={id:randomUUID(),key,to:body.to,text:body.messages[0].text};accepted.set(key,item);if(mode==='timeout-after-accept'){setTimeout(()=>{if(!res.destroyed)send(200,{sentMessages:[{id:item.id}]});},6000);return;}return send(200,{sentMessages:[{id:item.id}]});
 }
 return send(404,{message:'not found'});
}catch{res.writeHead(500);res.end();}}).listen(8898,'127.0.0.1',()=>console.log('Local mock LINE API ready on 127.0.0.1:8898; no real messages are sent.'));

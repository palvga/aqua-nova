import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function validateMeter(m){if(!/^[A-Za-z0-9_-]{1,64}$/.test(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>120||!['GSM','NB-IoT'].includes(m.transport)||!Number.isFinite(m.lat)||Math.abs(m.lat)>90||!Number.isFinite(m.lng)||Math.abs(m.lng)>180||!Number.isFinite(m.baseline)||m.baseline<0||!Number.isFinite(m.limit)||m.limit<0)throw Error('Date contor invalide');}
export function validateReading(r){if(typeof r.eventId!=='string'||!r.eventId.length||r.eventId.length>128||!Number.isSafeInteger(r.pulses)||r.pulses<0||typeof r.timestamp!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(r.timestamp)||!Number.isFinite(Date.parse(r.timestamp))||Date.parse(r.timestamp)>Date.now()+300000||r.battery!=null&&(!Number.isFinite(r.battery)||r.battery<0||r.battery>100))throw Error('Citire invalidă: eventId, timestamp UTC, pulses cumulativ, battery 0–100');}
export function flow(a,b){return (b.pulses-a.pulses)*.01/((Date.parse(b.timestamp)-Date.parse(a.timestamp))/3600000);}
const equal=(a,b)=>{let x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
export function createServer({dbPath='telecitire.sqlite',operatorToken,deviceTokens={},origin='https://palvga.github.io'}={}){
 if(!operatorToken||operatorToken.length<24)throw Error('OPERATOR_TOKEN trebuie să aibă minimum 24 caractere');
 if(Object.values(deviceTokens).some(x=>typeof x!=='string'||x.length<24))throw Error('Tokenurile contoarelor trebuie să aibă minimum 24 caractere');
 const db=new DatabaseSync(dbPath);db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS meters(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS readings(meter_id TEXT NOT NULL,event_id TEXT NOT NULL,timestamp TEXT NOT NULL,pulses INTEGER NOT NULL,battery REAL,PRIMARY KEY(meter_id,event_id),UNIQUE(meter_id,timestamp));`);
 const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  const o=req.headers.origin;if(o&&o!==origin)return reply(res,403,{error:'Origine nepermisă'});
  if(o){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const path=new URL(req.url,'http://localhost').pathname,auth=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!(req.method==='POST'&&path==='/api/readings')&&!equal(auth,operatorToken))return reply(res,401,{error:'Autentificare necesară'});
  try{
   if(req.method==='GET'&&path==='/api/meters'){let meters=db.prepare('SELECT data FROM meters ORDER BY id').all().map(x=>JSON.parse(x.data));for(let m of meters)m.readings=db.prepare('SELECT timestamp,pulses,battery FROM readings WHERE meter_id=? ORDER BY timestamp DESC LIMIT 1000').all(m.id).reverse();return reply(res,200,meters);}
   if(req.method!=='POST'||!['/api/meters','/api/readings'].includes(path))return reply(res,404,{error:'Rută inexistentă'});
   if(!req.headers['content-type']?.includes('application/json'))return reply(res,415,{error:'Folosește application/json'});
   let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)return reply(res,413,{error:'Mesaj prea mare'});raw+=chunk;}
   let body;try{body=JSON.parse(raw);}catch{return reply(res,400,{error:'JSON invalid'});}
   if(path==='/api/meters'){validateMeter(body);if(db.prepare('SELECT id FROM meters WHERE id=?').get(body.id))return reply(res,409,{error:'ID deja existent'});let m={id:body.id,name:body.name,transport:body.transport,lat:body.lat,lng:body.lng,baseline:body.baseline,limit:body.limit,dn:80,pulseLitres:10};db.prepare('INSERT INTO meters VALUES(?,?)').run(m.id,JSON.stringify(m));return reply(res,201,m);}
   if(!deviceTokens[body.meterId]||!equal(auth,deviceTokens[body.meterId]))return reply(res,401,{error:'Token dispozitiv invalid'});
   validateReading(body);body.timestamp=new Date(body.timestamp).toISOString();if(!db.prepare('SELECT id FROM meters WHERE id=?').get(body.meterId))return reply(res,404,{error:'Contor neînregistrat'});
   let existing=db.prepare('SELECT timestamp,pulses,battery FROM readings WHERE meter_id=? AND event_id=?').get(body.meterId,body.eventId);
   if(existing){if(existing.timestamp!==body.timestamp||existing.pulses!==body.pulses||(existing.battery??null)!==(body.battery??null))return reply(res,409,{error:'eventId reutilizat cu alte date'});return reply(res,200,{duplicate:true});}
   let before=db.prepare('SELECT pulses FROM readings WHERE meter_id=? AND timestamp<? ORDER BY timestamp DESC LIMIT 1').get(body.meterId,body.timestamp),after=db.prepare('SELECT pulses FROM readings WHERE meter_id=? AND timestamp>? ORDER BY timestamp LIMIT 1').get(body.meterId,body.timestamp);
   if(before&&body.pulses<before.pulses||after&&body.pulses>after.pulses)return reply(res,409,{error:'Contorul cumulativ a scăzut; verifică resetarea/înlocuirea loggerului'});
   if(db.prepare('SELECT event_id FROM readings WHERE meter_id=? AND timestamp=?').get(body.meterId,body.timestamp))return reply(res,409,{error:'Există deja citire pentru acest timp'});
   db.prepare('INSERT INTO readings VALUES(?,?,?,?,?)').run(body.meterId,body.eventId,body.timestamp,body.pulses,body.battery??null);return reply(res,201,{accepted:true});
  }catch(e){reply(res,400,{error:e.message});}
 });server.on('close',()=>db.close());server.requestTimeout=15000;server.headersTimeout=10000;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let server=createServer({dbPath:process.env.DB_PATH||'telecitire.sqlite',operatorToken:process.env.OPERATOR_TOKEN,deviceTokens:JSON.parse(process.env.DEVICE_TOKENS_JSON||'{}'),origin:process.env.ALLOWED_ORIGIN||'https://palvga.github.io'});server.listen(Number(process.env.PORT||8781),process.env.HOST||'127.0.0.1',()=>console.log('API telecitire: http://127.0.0.1:'+(process.env.PORT||8781)));}

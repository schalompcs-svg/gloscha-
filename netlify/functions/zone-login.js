const crypto = require('crypto');
function corsHeaders(event){
  const origin=event?.headers?.origin||event?.headers?.Origin||'';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:3999','http://127.0.0.1:3999','http://localhost:8100'];
  const h={'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
  if(allowed.includes(origin)) h['Access-Control-Allow-Origin']=origin;
  return h;
}
const COOKIE='gpian_zone';
function json(status,body,event,extra={}){return {statusCode:status,headers:Object.assign({'Content-Type':'application/json','Cache-Control':'no-store'},corsHeaders(event),extra),body:JSON.stringify(body)}}
exports.handler=async e=>{
  if(e.httpMethod==='OPTIONS') return {statusCode:204,headers:corsHeaders(e),body:''};
  if(e.httpMethod!=='POST') return json(405,{ok:false,error:'Méthode non autorisée.'},e);
  try{
    const {zone,username,password,emetteur}=JSON.parse(e.body||'{}');
    const z=String(zone||'').toUpperCase();
    if(!['A','B','C','D'].includes(z)) return json(400,{ok:false,error:'Zone invalide.'},e);
    const eu=process.env[`GPIAN_ZONE_${z}_USER`], ep=process.env[`GPIAN_ZONE_${z}_PASSWORD`];
    if(!eu||!ep) return json(500,{ok:false,error:`Configuration de la Zone ${z} manquante sur Netlify.`},e);
    if(String(username)!==eu||String(password)!==ep) return json(401,{ok:false,error:'Identifiants incorrects.'},e);
    const payload=Buffer.from(JSON.stringify({zone:z,emetteur:String(emetteur||'').trim(),exp:Date.now()+8*3600*1000})).toString('base64url');
    const sig=crypto.createHmac('sha256',process.env.GPIAN_ADMIN_SECRET||'').update(payload).digest('hex');
    return json(200,{ok:true,zone:z,emetteur:String(emetteur||'').trim() },e,{'Set-Cookie':`${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`});
  }catch(err){console.error(err);return json(400,{ok:false,error:'Requête invalide.'},e)}
};


function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const { getStore } = require("@netlify/blobs");
const crypto=require("crypto");
function response(statusCode,body,event){return {statusCode,headers:Object.assign({"Content-Type":"application/json","Cache-Control":"no-store"},corsHeaders(event)),body:JSON.stringify(body)}}
function slug(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function validSession(event){try{const cookie=event.headers?.cookie||event.headers?.Cookie||'';const m=cookie.match(/(?:^|;\s*)gpian_admin=([^;]+)/);if(!m)return false;const token=decodeURIComponent(m[1]);const [exp,sig]=token.split('.');const secret=process.env.GPIAN_ADMIN_SECRET;if(!secret||!exp||!sig||Number(exp)<Date.now())return false;const expected=crypto.createHmac('sha256',secret).update(String(exp)).digest('hex');return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
exports.handler=async(event)=>{ if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:corsHeaders(event),body:''};
 if(!['GET','POST'].includes(event.httpMethod))return response(405,{ok:false,error:'Méthode non autorisée'},event);
 const store=getStore('gpian-responsables');
 try{
  if(event.httpMethod==='GET'){
   const {blobs}=await store.list();const responsables=[];
   for(const b of blobs){if(b.key==='manifest'||b.key.startsWith('photos/'))continue;const x=await store.get(b.key,{type:'json'});if(x)responsables.push(x)}
   return response(200,{ok:true,responsables},event);
  }
  if(!validSession(event))return response(401,{ok:false,error:'Session administrateur invalide ou expirée.'},event);
  const d=JSON.parse(event.body||'{}'); const eglise=String(d.eglise||d.nom||'').trim(), nom=String(d.responsable||d.nom||'').trim();
  if(!eglise||!nom)return response(400,{ok:false,error:"L'église et le nom du responsable sont obligatoires."},event);
  const id=slug(eglise);
  const rec={id,eglise,nom,fonction:String(d.fonction||d.role||'Responsable'),telephone:String(d.telephone||d.phone||''),adresse:String(d.adresse||d.address||''),badge:String(d.badge||''),photo:String(d.photo||''),updatedAt:new Date().toISOString()};
  await store.setJSON(id,rec); return response(200,{ok:true,mesage:'Affectation enregistrée avec succès.',message:'Affectation enregistrée avec succès.',responsable:rec},event);
 }catch(e){console.error(e);return response(500,{ok:false,error:'Erreur serveur lors de l’enregistrement.'},event)}
};

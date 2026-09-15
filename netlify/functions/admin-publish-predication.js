
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");
function response(statusCode, body, event){return {statusCode,headers:Object.assign({"Content-Type":"application/json","Cache-Control":"no-store"},corsHeaders(event)),body:JSON.stringify(body)}}
function validSession(event){try{const cookie=event.headers?.cookie||event.headers?.Cookie||"";const m=cookie.match(/(?:^|;\s*)gpian_admin=([^;]+)/);if(!m)return false;const token=decodeURIComponent(m[1]);const [exp,sig]=token.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;const secret=process.env.GPIAN_ADMIN_SECRET;if(!secret)return false;const expected=crypto.createHmac('sha256',secret).update(String(exp)).digest('hex');return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
exports.handler=async(event)=>{ if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:corsHeaders(event),body:''};
 if(event.httpMethod!=='POST')return response(405,{ok:false,error:'Méthode non autorisée.'},event);
 if(!validSession(event))return response(401,{ok:false,error:'Session administrateur invalide ou expirée.'},event);
 try{
  const d=JSON.parse(event.body||'{}'); const titre=String(d.titre||'').trim(), contenu=String(d.contenu||'').trim();
  if(!titre||!contenu)return response(400,{ok:false,error:'Titre ou contenu manquant.'},event);
  const id=`${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
  const publication={id,titre,contenu,texte:contenu,date:d.date||new Date().toISOString(),theme:String(d.theme||'').trim(),orateur:String(d.orateur||'').trim(),introduction:String(d.introduction||'').trim(),verset:String(d.verset||'').trim(),photos:Array.isArray(d.photos)?d.photos.slice(0,8):[]};
  const store=getStore('gpian-predications'); await store.setJSON(id,publication);
  return response(200,{ok:true,publication,message:'Prédication ajoutée sans remplacer les précédentes.'},event);
 }catch(e){console.error(e);return response(500,{ok:false,error:'Erreur serveur: '+(e?.message||'erreur inconnue')},event)}
};

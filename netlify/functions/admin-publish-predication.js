function corsHeaders(event){const origin=event?.headers?.origin||event?.headers?.Origin||'';const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:3999','http://127.0.0.1:3999','http://localhost:8100'];const h={'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};if(allowed.includes(origin))h['Access-Control-Allow-Origin']=origin;return h}
const {getStore}=require('@netlify/blobs'); const crypto=require('crypto');
const ALLOWED_STATUS=new Set(['draft','ready','published','rejected','archived']);
const STATUS_LABEL={draft:'Brouillon',ready:'Prêt à publier',published:'Publié',rejected:'Rejeté',archived:'Archivé'};
const json=(status,body,event)=>({statusCode:status,headers:Object.assign({'Content-Type':'application/json','Cache-Control':'no-store'},corsHeaders(event)),body:JSON.stringify(body)});
function validSession(event){try{const cookie=event.headers?.cookie||event.headers?.Cookie||'';const m=cookie.match(/(?:^|;\s*)gpian_admin=([^;]+)/);if(!m)return false;const token=decodeURIComponent(m[1]);const [exp,sig]=token.split('.');const secret=process.env.GPIAN_ADMIN_SECRET;if(!secret||!exp||!sig||Number(exp)<Date.now())return false;const expected=crypto.createHmac('sha256',secret).update(String(exp)).digest('hex');return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:corsHeaders(event),body:''};
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'Méthode non autorisée.'},event);
 if(!validSession(event))return json(401,{ok:false,error:'Session administrateur invalide ou expirée.'},event);
 try{
  const d=JSON.parse(event.body||'{}'); const titre=String(d.titre||'').trim(), contenu=String(d.contenu||'').trim(); if(!titre||!contenu)return json(400,{ok:false,error:'Titre ou contenu manquant.'},event);
  const status=ALLOWED_STATUS.has(String(d.status||''))?String(d.status):'published';
  const id=`${Date.now()}-${crypto.randomBytes(5).toString('hex')}`; const store=getStore('gpian-predications'); const photos=[];
  for(let i=0;i<(Array.isArray(d.photos)?d.photos.slice(0,8):[]).length;i++){const ph=d.photos[i]||{};const data=String(ph.data||ph.url||'');const m=data.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);if(!m)continue;const buf=Buffer.from(m[2].replace(/\s/g,''),'base64');if(!buf.length||buf.length>3*1024*1024)continue;const ext=m[1].toLowerCase().includes('png')?'png':m[1].toLowerCase().includes('webp')?'webp':'jpg';const key=`photos/${id}-${i}.${ext}`;await store.set(key,buf,{metadata:{contentType:m[1]}});photos.push({url:`/.netlify/functions/predication-photo?key=${encodeURIComponent(key)}`,legend:String(ph.legend||ph.name||'')})}
  const publication={id,titre,contenu,texte:contenu,date:d.date||new Date().toISOString(),theme:String(d.theme||'').trim(),orateur:String(d.orateur||'').trim(),introduction:String(d.introduction||'').trim(),verset:String(d.verset||'').trim(),status,statusLabel:STATUS_LABEL[status],photos}; await store.setJSON(id,publication);
  return json(200,{ok:true,publication,message:status==='published'?'Prédication publiée sans remplacer les précédentes.':`Prédication enregistrée avec le statut « ${STATUS_LABEL[status]} ».`},event);
 }catch(e){console.error(e);return json(500,{ok:false,error:'Erreur serveur pendant la publication.'},event)}
};

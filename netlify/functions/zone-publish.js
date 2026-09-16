function corsHeaders(event){
  const origin=event?.headers?.origin||event?.headers?.Origin||'';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:3999','http://127.0.0.1:3999','http://localhost:8100'];
  const h={'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
  if(allowed.includes(origin))h['Access-Control-Allow-Origin']=origin; return h;
}
const {getStore}=require('@netlify/blobs'); const crypto=require('crypto'); const {auth}=require('./zone-auth');
const json=(status,body,event)=>({statusCode:status,headers:Object.assign({'Content-Type':'application/json','Cache-Control':'no-store'},corsHeaders(event)),body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:corsHeaders(event),body:''};
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'Méthode non autorisée.'},event);
 const a=auth(event); if(!a)return json(401,{ok:false,error:'Session de zone invalide ou expirée.'},event);
 try{
  const x=JSON.parse(event.body||'{}');
  if(!['testimony','report','preaching'].includes(x.type)||!String(x.title||'').trim()||!String(x.content||'').trim())return json(400,{ok:false,error:'Type, titre et contenu obligatoires.'},event);
  const photos=Array.isArray(x.photos)?x.photos.slice(0,8):[];
  const id=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const store=getStore('gpian-zone-content'); const photoUrls=[];
  for(let i=0;i<photos.length;i++){
    const ph=photos[i]||{}; const data=String(ph.data||ph.url||'');
    const m=data.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i); if(!m)continue;
    const buf=Buffer.from(m[2].replace(/\s/g,''),'base64'); if(!buf.length||buf.length>3*1024*1024)continue;
    const ext=m[1].toLowerCase().includes('png')?'png':m[1].toLowerCase().includes('webp')?'webp':'jpg';
    const key=`photos/${id}-${i}.${ext}`; await store.set(key,buf,{metadata:{contentType:m[1],zone:a.zone}}); photoUrls.push({url:`/.netlify/functions/zone-photo?key=${encodeURIComponent(key)}`,legend:String(ph.name||ph.legend||'')});
  }
  const item={id,zone:a.zone,emetteur:String(x.emetteur||a.emetteur||'').trim(),type:x.type,title:String(x.title).trim(),content:String(x.content).trim(),author:String(x.author||'').trim(),meta:String(x.meta||'').trim(),photos:photoUrls,date:new Date().toISOString()};
  await store.setJSON(`item-${id}`,item);
  return json(200,{ok:true,id,item,message:'Publication ajoutée sans remplacer les précédentes.'},event);
 }catch(e){console.error(e);return json(500,{ok:false,error:'Erreur serveur pendant la publication.'},event)}
};

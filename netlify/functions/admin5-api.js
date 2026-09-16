const {getStore}=require('@netlify/blobs');
const crypto=require('crypto');
function cors(event){const origin=event?.headers?.origin||event?.headers?.Origin||'';const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:3999','http://127.0.0.1:3999','http://localhost:8100'];const h={'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};if(allowed.includes(origin))h['Access-Control-Allow-Origin']=origin;return h}
function out(status,body,event){return {statusCode:status,headers:Object.assign({'Content-Type':'application/json','Cache-Control':'no-store'},cors(event)),body:JSON.stringify(body)}}
function auth(event){try{const c=event.headers?.cookie||event.headers?.Cookie||'';const m=c.match(/(?:^|;\s*)gpian_admin=([^;]+)/);if(!m)return false;const [exp,sig]=decodeURIComponent(m[1]).split('.');const secret=process.env.GPIAN_ADMIN_SECRET;if(!secret||!exp||!sig||Number(exp)<Date.now())return false;const expected=crypto.createHmac('sha256',secret).update(String(exp)).digest('hex');return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}}
const DEFAULT={siteName:"Églises International de l’Arche de Noé (GPIAN)",brandTitle:"ÉGLISES INTERNATIONAL • GPIAN",brandSub:"ARCHE DE NOÉ",announcement:"✦ JÉSUS-CHRIST EST SEIGNEUR — ÉGLISES INTERNATIONAL DE L’ARCHE DE NOÉ (GPIAN)",colors:{deep:'#26215C',mid:'#3C3489',burgundy:'#72243E',accent:'#ED93B1',button:'#D4537E',buttonText:'#4B1528',soft:'#EEEDFE'},pages:{
'index.html':{title:'Accueil',description:'Une famille, une foi, une destinée.',heroTitle:'L’ARCHE DE NOÉ',heroText:'Une famille, une foi, une destinée. Découvrez une maison consacrée à Dieu et tournée vers l’impact des nations.'},
'predications.html':{title:'Prédications',description:'Messages, enseignements et paroles pour l’édification.',heroTitle:'PRÉDICATIONS',heroText:''},
'sites.html':{title:'Nos églises',description:'Le réseau national des Églises International de l’Arche de Noé.',heroTitle:'NOS ÉGLISES',heroText:''},
'alliance-prophetique.html':{title:'Alliance prophétique',description:'Découvrez l’Alliance prophétique.',heroTitle:'ALLIANCE PROPHÉTIQUE',heroText:''},
'evenements.html':{title:'Événements',description:'Programmes et grands rendez-vous.',heroTitle:'ÉVÉNEMENTS',heroText:''},
'temoignages.html':{title:'Témoignages',description:'Témoignages et expériences publiés par les zones.',heroTitle:'TÉMOIGNAGES',heroText:''},
'comptes-rendus.html':{title:'Comptes rendus',description:'Comptes rendus de l’œuvre par zone.',heroTitle:'COMPTES RENDUS',heroText:''},
'tv.html':{title:'TV',description:'Notre chaîne TV GPIAN.',heroTitle:'TV GPIAN',heroText:''},
'contact.html':{title:'Contact',description:'Nous contacter et demander la prière.',heroTitle:'CONTACT',heroText:''},
'dons.html':{title:'Faire un don',description:'Soutenir l’œuvre de l’Arche de Noé.',heroTitle:'FAIRE UN DON',heroText:''},
'eglise.html':{title:'À propos',description:'Mission, vision et foi.',heroTitle:'À PROPOS',heroText:''}
}};
async function readSettings(store){const x=await store.get('settings',{type:'json'});return Object.assign({},DEFAULT,{...(x||{}),colors:{...DEFAULT.colors,...((x&&x.colors)||{})},pages:{...DEFAULT.pages,...((x&&x.pages)||{})}})}
async function audit(store,action,detail){const id=Date.now()+'-'+crypto.randomBytes(3).toString('hex');await store.setJSON('audit/'+id,{id,action,detail:String(detail||''),at:new Date().toISOString(),by:process.env.GPIAN_ADMIN_USER||'gpian'})}
exports.handler=async(event)=>{if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:cors(event),body:''};const action=new URLSearchParams(event.rawQuery||'').get('action')||'state';const store=getStore('gpian-admin5');
try{
 if(event.httpMethod==='GET'){
  if(action==='state'){const settings=await readSettings(store);const a=await store.list({prefix:'audit/'});const auditLog=[];if(auth(event)){for(const b of a.blobs.slice(-50)){const x=await store.get(b.key,{type:'json'});if(x)auditLog.push(x)}auditLog.sort((a,b)=>new Date(b.at)-new Date(a.at));}return out(200,{ok:true,settings,audit:auditLog},event)}
  if(action==='churches'){const z=await store.get('zones',{type:'json'});return out(200,{ok:true,zones:z||{rows:[]}},event)}
  return out(404,{ok:false,error:'Action inconnue.'},event)
 }
 if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Méthode non autorisée.'},event);if(!auth(event))return out(401,{ok:false,error:'Session Admin 5 invalide ou expirée.'},event);
 const d=JSON.parse(event.body||'{}');
 if(action==='settings'){const old=await readSettings(store);const next={...old,...(d.settings||{}),colors:{...old.colors,...((d.settings&&d.settings.colors)||{})},pages:{...old.pages,...((d.settings&&d.settings.pages)||{})}};await store.setJSON('settings',next);await audit(store,'settings','Mise à jour du design et des textes');return out(200,{ok:true,settings:next},event)}
 if(action==='zones'){await store.setJSON('zones',d.zones||{});await audit(store,'zones','Mise à jour des affectations par zone');return out(200,{ok:true},event)}
 if(action==='backup'){const settings=await readSettings(store);const zones=await store.get('zones',{type:'json'});const id='backup/'+Date.now();await store.setJSON(id,{id,at:new Date().toISOString(),settings,zones});await audit(store,'backup','Sauvegarde complète Admin 5');return out(200,{ok:true,id},event)}
 if(action==='restore'){const backups=await store.list({prefix:'backup/'});if(!backups.blobs.length)return out(404,{ok:false,error:'Aucune sauvegarde.'},event);const key=backups.blobs.sort((a,b)=>String(b.key).localeCompare(String(a.key)))[0].key;const b=await store.get(key,{type:'json'});if(!b)return out(404,{ok:false,error:'Sauvegarde introuvable.'},event);if(b.settings)await store.setJSON('settings',b.settings);if(b.zones)await store.setJSON('zones',b.zones);await audit(store,'restore',key);return out(200,{ok:true},event)}
 if(action==='delete-predication'){const id=String(d.id||'');if(!id)return out(400,{ok:false,error:'ID manquant.'},event);const s=getStore('gpian-predications');await s.delete(id);await audit(store,'delete-predication',id);return out(200,{ok:true},event)}
 if(action==='delete-zone-item'){const id=String(d.id||'');if(!id)return out(400,{ok:false,error:'ID manquant.'},event);const s=getStore('gpian-zone-content');await s.delete('item-'+id);await audit(store,'delete-zone-item',id);return out(200,{ok:true},event)}
 return out(404,{ok:false,error:'Action inconnue.'},event)
}catch(e){console.error(e);return out(500,{ok:false,error:'Erreur serveur Admin 5.'},event)}};

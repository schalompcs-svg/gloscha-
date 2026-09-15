
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const {getStore}=require('@netlify/blobs');
exports.handler=async event=>{if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:corsHeaders(event),body:''};try{const type=new URLSearchParams(event.rawQuery||'').get('type');const store=getStore('gpian-zone-content');const {blobs}=await store.list();const items=[];for(const b of blobs){const raw=await store.get(b.key);if(!raw)continue;try{const x=JSON.parse(raw);if(!type||x.type===type)items.push(x)}catch{}}items.sort((a,b)=>String(b.date).localeCompare(String(a.date)));return {statusCode:200,headers:Object.assign({'Content-Type':'application/json','Cache-Control':'no-store'},corsHeaders(event)),body:JSON.stringify({items})}}catch(e){return {statusCode:500,headers:corsHeaders(event),body:JSON.stringify({items:[],error:'Erreur serveur'})}}}

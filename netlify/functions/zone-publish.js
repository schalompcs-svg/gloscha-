
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const {getStore}=require('@netlify/blobs');const {auth}=require('./zone-auth');
exports.handler=async event=>{if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:corsHeaders(event),body:''};const a=auth(event);if(!a)return {statusCode:401,headers:corsHeaders(event),body:JSON.stringify({ok:false,error:'Non authentifié'})};if(event.httpMethod!=='POST')return {statusCode:405,headers:corsHeaders(event),body:'Method not allowed'};try{const x=JSON.parse(event.body||'{}');if(!['testimony','report','preaching'].includes(x.type)||!x.title||!x.content)return {statusCode:400,headers:corsHeaders(event),body:JSON.stringify({ok:false,error:'Type, titre et contenu obligatoires'})};const id=`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;const item={id,zone:a.zone,type:x.type,title:x.title,content:x.content,author:x.author||'',meta:x.meta||'',photos:Array.isArray(x.photos)?x.photos.slice(0,8):[],date:new Date().toISOString()};const store=getStore('gpian-zone-content');await store.set(`item-${id}`,JSON.stringify(item));return {statusCode:200,headers:corsHeaders(event),body:JSON.stringify({ok:true,id})}}catch(e){return {statusCode:500,headers:corsHeaders(event),body:JSON.stringify({ok:false,error:'Erreur serveur'})}}}

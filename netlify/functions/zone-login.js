
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const crypto=require('crypto');
const COOKIE='gpian_zone';
function sig(v){return crypto.createHmac('sha256',process.env.GPIAN_ADMIN_SECRET||'change-me').update(v).digest('hex')}
exports.handler=async e=>{if(e.httpMethod==='OPTIONS')return {statusCode:204,headers:corsHeaders(e),body:''};if(e.httpMethod!=='POST')return {statusCode:405,headers:corsHeaders(e),body:'Method not allowed'};try{const {zone,username,password}=JSON.parse(e.body||'{}');const z=String(zone||'').toUpperCase();if(!['A','B','C','D'].includes(z))return {statusCode:400,headers:corsHeaders(e),body:JSON.stringify({ok:false,error:'Zone invalide'})};const eu=process.env[`GPIAN_ZONE_${z}_USER`],ep=process.env[`GPIAN_ZONE_${z}_PASSWORD`];if(!eu||!ep)return {statusCode:500,headers:corsHeaders(e),body:JSON.stringify({ok:false,error:'Configuration des identifiants de zone manquante sur Netlify'})};if(username!==eu||password!==ep)return {statusCode:401,headers:corsHeaders(e),body:JSON.stringify({ok:false})};const payload=Buffer.from(JSON.stringify({zone:z,exp:Date.now()+8*3600*1000})).toString('base64url');const token=payload+'.'+sig(payload);return {statusCode:200,headers:Object.assign({'Set-Cookie':`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,'Content-Type':'application/json'},corsHeaders(e)),body:JSON.stringify({ok:true,zone:z})}}catch(e){return {statusCode:400,headers:corsHeaders(e),body:JSON.stringify({ok:false,error:'Requête invalide'})}}}

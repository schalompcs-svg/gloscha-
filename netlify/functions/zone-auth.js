const crypto=require('crypto');
function auth(event){
  try{
    const c=event.headers?.cookie||event.headers?.Cookie||'';
    const m=c.match(/(?:^|;\s*)gpian_zone=([^;]+)/); if(!m)return null;
    const token=decodeURIComponent(m[1]); const [p,s]=token.split('.'); if(!p||!s)return null;
    const secret=process.env.GPIAN_ADMIN_SECRET; if(!secret)return null;
    const expected=crypto.createHmac('sha256',secret).update(p).digest('hex');
    if(s.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;
    const d=JSON.parse(Buffer.from(p,'base64url').toString());
    if(Date.now()>Number(d.exp)||!['A','B','C','D'].includes(d.zone))return null;
    return d;
  }catch{return null}
}
module.exports={auth};

const crypto=require('crypto');
function auth(event){const c=event.headers?.cookie||'';const m=c.match(/(?:^|;\s*)gpian_zone=([^;]+)/);if(!m)return null;const [p,s]=m[1].split('.');if(!p||!s)return null;const expected=crypto.createHmac('sha256',process.env.GPIAN_ADMIN_SECRET||'change-me').update(p).digest('hex');if(!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;try{const d=JSON.parse(Buffer.from(p,'base64url').toString());if(Date.now()>d.exp)return null;return d}catch{return null}}
module.exports={auth};

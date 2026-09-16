function corsHeaders(event){
  const origin=event?.headers?.origin||event?.headers?.Origin||'';
  const allowed=[
    'https://gpian.netlify.app',
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    'http://localhost:3999',
    'http://127.0.0.1:3999',
    'http://localhost:8100'
  ];
  const h={
    'Access-Control-Allow-Credentials':'true',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'GET,OPTIONS',
    'Vary':'Origin'
  };
  if(allowed.includes(origin)) h['Access-Control-Allow-Origin']=origin;
  return h;
}

const {getStore}=require('@netlify/blobs');
const crypto=require('crypto');

const STATUS_LABEL={
  draft:'Brouillon',
  ready:'Prêt à publier',
  published:'Publié',
  rejected:'Rejeté',
  archived:'Archivé'
};

function json(status,body,event){
  return {
    statusCode:status,
    headers:Object.assign({
      'Content-Type':'application/json',
      'Cache-Control':'no-store'
    },corsHeaders(event)),
    body:JSON.stringify(body)
  };
}

function validSession(event){
  try{
    const cookie=event.headers?.cookie||event.headers?.Cookie||'';
    const m=cookie.match(/(?:^|;\s*)gpian_admin=([^;]+)/);
    if(!m)return false;

    const token=decodeURIComponent(m[1]);
    const [exp,sig]=token.split('.');
    const secret=process.env.GPIAN_ADMIN_SECRET;

    if(!secret||!exp||!sig||Number(exp)<Date.now())return false;

    const expected=crypto
      .createHmac('sha256',secret)
      .update(String(exp))
      .digest('hex');

    return sig.length===expected.length &&
      crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expected)
      );
  }catch{
    return false;
  }
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS'){
    return {
      statusCode:204,
      headers:corsHeaders(event),
      body:''
    };
  }

  if(event.httpMethod!=='GET'){
    return json(405,{ok:false,error:'Méthode non autorisée.'},event);
  }

  try{
    const params=new URLSearchParams(
      event.rawQuery||event.queryStringParameters
        ? (event.rawQuery||new URLSearchParams(event.queryStringParameters||{}).toString())
        : ''
    );

    const admin=params.get('admin')==='1';

    if(admin&&!validSession(event)){
      return json(401,{
        ok:false,
        error:'Session administrateur invalide ou expirée.'
      },event);
    }

    const store=getStore('gpian-predications');
    const {blobs}=await store.list({prefix:''});
    const result=[];

    for(const b of blobs){
      if(b.key.startsWith('photos/'))continue;

      const data=await store.get(b.key,{type:'json'});
      if(!data)continue;

      const status=STATUS_LABEL[data.status]
        ? data.status
        : 'published';

      const normalized=Object.assign({},data,{
        status,
        statusLabel:STATUS_LABEL[status]
      });

      if(admin || status==='published'){
        result.push(normalized);
      }
    }

    result.sort((a,b)=>
      new Date(b.date||0)-new Date(a.date||0)
    );

    return json(200,{
      ok:true,
      admin,
      predications:result
    },event);

  }catch(e){
    console.error(e);
    return json(500,{
      ok:false,
      error:'Impossible de charger les prédications.'
    },event);
  }
};

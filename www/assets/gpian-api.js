/* GPIAN API bridge: works on Netlify, local preview and the Android Capacitor app. */
(function(){
  const NETLIFY_API='https://gpian.netlify.app/.netlify/functions';
  const host=String(location.hostname||'').toLowerCase();
  const sameSite=host==='gpian.netlify.app' || host.endsWith('.netlify.app');
  window.GPIAN_API_BASE=window.GPIAN_API_BASE || (sameSite ? '/.netlify/functions' : NETLIFY_API);
  window.gpianApiUrl=function(path){
    return String(window.GPIAN_API_BASE).replace(/\/$/,'')+'/'+String(path).replace(/^\//,'');
  };
  window.gpianFetch=function(path,options){
    const o=Object.assign({},options||{});
    o.credentials=o.credentials||'include';
    o.cache=o.cache||'no-store';
    return fetch(window.gpianApiUrl(path),o).then(async r=>{
      const text=await r.text();
      let data=null;
      try{data=text?JSON.parse(text):null}catch(_){data=null;}
      if(!data){
        const err=new Error('Réponse serveur invalide ('+r.status+')');
        err.status=r.status; err.raw=text;
        throw err;
      }
      return {ok:r.ok,status:r.status,data,headers:r.headers,json:async()=>data,text:async()=>text};
    });
  };
})();

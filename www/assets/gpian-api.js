/* GPIAN API bridge: Netlify production + local Termux + Capacitor. */
(function(){
  const PROD='https://gpian.netlify.app/.netlify/functions';
  const host=String(location.hostname||'').toLowerCase();
  let base=window.GPIAN_API_BASE;
  if(!base){
    if(host==='gpian.netlify.app' || host.endsWith('.netlify.app')) base='/.netlify/functions';
    else if(host==='localhost' || host==='127.0.0.1') base='http://localhost:9999/.netlify/functions';
    else if(location.protocol==='capacitor:') base='https://gpian.netlify.app/.netlify/functions';
    else base=PROD;
  }
  window.GPIAN_API_BASE=base;
  window.gpianApiUrl=function(path){return String(window.GPIAN_API_BASE).replace(/\/$/,'')+'/'+String(path).replace(/^\//,'')};
  window.gpianFetch=function(path,options){
    const o=Object.assign({},options||{}); o.credentials=o.credentials||'include'; o.cache=o.cache||'no-store';
    return fetch(window.gpianApiUrl(path),o).then(async r=>{
      const text=await r.text(); let data=null; try{data=text?JSON.parse(text):null}catch(_){}
      if(data===null){const e=new Error('Réponse serveur invalide ('+r.status+')');e.status=r.status;e.raw=text;throw e}
      return {ok:r.ok,status:r.status,data,headers:r.headers,json:async()=>data,text:async()=>text};
    });
  };
})();

/* GPIAN runtime: central visual/content layer controlled by Admin 5. */
(function(){
  const BASE=(window.GPIAN_API_BASE||'https://gpian.netlify.app/.netlify/functions').replace(/\/$/,'');
  const DEFAULTS={siteName:"Églises International de l’Arche de Noé (GPIAN)",brandTitle:"ÉGLISES INTERNATIONAL • GPIAN",brandSub:"ARCHE DE NOÉ",announcement:"✦ JÉSUS-CHRIST EST SEIGNEUR — ÉGLISES INTERNATIONAL DE L’ARCHE DE NOÉ (GPIAN)",colors:{deep:'#26215C',mid:'#3C3489',burgundy:'#72243E',accent:'#ED93B1',button:'#D4537E',buttonText:'#4B1528',soft:'#EEEDFE'},pages:{}}
  const page=(location.pathname.split('/').pop()||'index.html')||'index.html';
  function apply(s){s=s||DEFAULTS; const c=Object.assign({},DEFAULTS.colors,s.colors||{}); const r=document.documentElement; r.style.setProperty('--royal-deep',c.deep);r.style.setProperty('--royal-mid',c.mid);r.style.setProperty('--burgundy',c.burgundy);r.style.setProperty('--pink',c.accent);r.style.setProperty('--pink-strong',c.button);r.style.setProperty('--pink-dark',c.buttonText);r.style.setProperty('--soft',c.soft);r.style.setProperty('--navy',c.deep);r.style.setProperty('--navy2',c.mid);r.style.setProperty('--navy3',c.burgundy);r.style.setProperty('--gold',c.accent);r.style.setProperty('--gold2',c.accent);r.style.setProperty('--text',c.soft);
    const q=(x)=>document.querySelector(x); const set=(sel,v)=>{const e=q(sel);if(e&&v!==undefined)e.textContent=v};
    set('.announcement',s.announcement); set('.brand-title',s.brandTitle); set('.brand-sub',s.brandSub);
    const p=s.pages&&s.pages[page]; if(p){set('.page-hero h1',p.title);set('.page-hero p',p.description);if(page==='index.html'){set('.hero h1',p.heroTitle);set('.hero p',p.heroText)}}
    document.title=(p&&p.title?s.siteName+' — '+p.title:s.siteName);
    document.querySelectorAll('.navlinks a').forEach(a=>{if(a.getAttribute('href')==='actualites.html')a.setAttribute('href','temoignages.html');if(a.getAttribute('href')==='medias.html')a.setAttribute('href','predications.html');if(a.getAttribute('href')==='ministeres.html')a.setAttribute('href','alliance-prophetique.html');});
  }
  function fetchState(){return fetch(BASE+'/admin5-api?action=state',{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)}
  document.addEventListener('DOMContentLoaded',()=>{apply(DEFAULTS);fetchState().then(d=>{if(d&&d.ok&&d.settings)apply(d.settings)})});
})();

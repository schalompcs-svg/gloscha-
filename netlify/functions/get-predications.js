
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return {statusCode:204,headers:corsHeaders(event),body:""};
  try {
    const store = getStore("gpian-predications");
    const { blobs } = await store.list();

    const result = [];

    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: "json" });
      if (data) result.push(data);
    }

    result.sort((a,b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: Object.assign({"Content-Type":"application/json","Cache-Control":"no-cache"}, corsHeaders(event)),
      body: JSON.stringify({ ok:true, predications:result })
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: JSON.stringify({ ok:false, error:"Impossible de charger les prédications." })
    };
  }
};

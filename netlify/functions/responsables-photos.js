
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
    const store = getStore("gpian-responsables");

    const manifest = await store.get("manifest", {
      type: "json"
    }) || {};

    const photos = {};

    for (const slug of Object.keys(manifest)) {
      photos[slug] =
        `/.netlify/functions/responsable-photo?slug=${encodeURIComponent(slug)}`;
    }

    return {
      statusCode: 200,
      headers: Object.assign({"Content-Type":"application/json","Cache-Control":"no-store"}, corsHeaders(event)),
      body: JSON.stringify({
        ok: true,
        photos
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers: Object.assign({"Content-Type":"application/json"}, corsHeaders(event)),
      body: JSON.stringify({
        ok: false,
        photos: {}
      })
    };
  }
};

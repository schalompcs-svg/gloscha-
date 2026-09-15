
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(event), body: "" };
  try {
    const slug = String(event.queryStringParameters?.slug || "").trim();

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        body: "Photo invalide"
      };
    }

    const store = getStore("gpian-responsables");

    const result = await store.getWithMetadata(
      `photos/${slug}`,
      { type: "arrayBuffer" }
    );

    if (!result || !result.data) {
      return {
        statusCode: 404,
        headers: Object.assign({"Cache-Control":"no-store"}, corsHeaders(event)),
        body: "Photo introuvable"
      };
    }

    const contentType =
      result.metadata?.contentType || "image/jpeg";

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: Object.assign({"Content-Type":contentType,"Cache-Control":"public, max-age=300"}, corsHeaders(event)),
      body: Buffer.from(result.data).toString("base64")
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers: corsHeaders(event),
      body: "Erreur serveur"
    };
  }
};

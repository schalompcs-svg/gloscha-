
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(event), body: "" };
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(event)),
      body: JSON.stringify({ ok: false, error: "Méthode non autorisée" })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const username = String(data.username || "");
    const password = String(data.password || "");

    if (
      username !== process.env.GPIAN_ADMIN_USER ||
      password !== process.env.GPIAN_ADMIN_PASSWORD
    ) {
      return {
        statusCode: 401,
        headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(event)),
        body: JSON.stringify({
          ok: false,
          error: "Identifiants incorrects."
        })
      };
    }

    const secret = process.env.GPIAN_ADMIN_SECRET;

    if (!secret) {
      console.error("GPIAN_ADMIN_SECRET manquant");

      return {
        statusCode: 500,
        headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(event)),
        body: JSON.stringify({
          ok: false,
          error: "Configuration serveur incomplète."
        })
      };
    }

    const exp = Date.now() + 3600000;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(String(exp))
      .digest("hex");

    const token = `${exp}.${signature}`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie":
          `gpian_admin=${encodeURIComponent(token)}; ` +
          `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      },
      body: JSON.stringify({
        ok: true
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 400,
      headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(event)),
      body: JSON.stringify({
        ok: false,
        error: "Requête invalide."
      })
    };
  }
};

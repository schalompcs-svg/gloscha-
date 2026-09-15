
function corsHeaders(event){
  const origin=event?.headers?.origin || event?.headers?.Origin || '';
  const allowed=['https://gpian.netlify.app','capacitor://localhost','https://localhost','http://localhost','http://localhost:8100'];
  const allow=allowed.includes(origin)?origin:'https://gpian.netlify.app';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
}
const crypto = require("crypto");

function response(statusCode, body, event) {
  return {
    statusCode,
    headers: Object.assign({"Content-Type":"application/json","Cache-Control":"no-store"}, corsHeaders(event)),
    body: JSON.stringify(body)
  };
}

function getCookie(event, name) {
  const cookies = event.headers?.cookie || event.headers?.Cookie || "";
  const match = cookies.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function verifyAdmin(event) {
  const token = getCookie(event, "gpian_admin");
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const exp = Number(parts[0]);
  const signature = parts[1];

  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const secret = process.env.GPIAN_ADMIN_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(exp))
    .digest("hex");

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(event), body: "" };
  if (verifyAdmin(event)) {
    return response(200, {
      authenticated: true,
      username: process.env.GPIAN_ADMIN_USER || "admin"
    }, event);
  }

  return response(401, {
    authenticated: false
  }, event);
};

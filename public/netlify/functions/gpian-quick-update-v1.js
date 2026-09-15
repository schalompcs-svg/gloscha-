const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const STORE = "gpian-contenus";
const COOKIE = "gpian_admin_v1";

function verify(event) {
  try {
    const raw = (event.headers?.cookie || "")
      .split(";")
      .map(x => x.trim())
      .find(x => x.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1);

    const [body, sig] = decodeURIComponent(raw || "").split(".");
    const secret = process.env.GPIAN_ADMIN_SECRET || "";
    const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");

    if (sig !== expected) return null;

    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.role === "admin" && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!verify(event)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Administration requise" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const allowed = [
      "actualite",
      "predication",
      "temoignage",
      "annonce",
      "evenement",
      "antv",
      "photo",
      "video",
      "texte"
    ];

    const type = String(body.type || "").toLowerCase();

    if (!allowed.includes(type)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Type non autorisé" })
      };
    }

    const item = {
      id: crypto.randomUUID(),
      type,
      titre: String(body.titre || "").trim().slice(0, 180),
      contenu: String(body.contenu || "").trim().slice(0, 30000),
      mediaUrl: String(body.mediaUrl || "").trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
      archived: false
    };

    const s = getStore(STORE);
    const existing = await s.get("updates", { type: "json" });
    const list = Array.isArray(existing) ? existing : [];

    list.unshift(item);
    await s.setJSON("updates", list);

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, item })
    };
  } catch {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Erreur serveur" })
    };
  }
};

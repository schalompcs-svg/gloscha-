const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const STORE = "gpian-temoignages";
const ADMIN_COOKIE = "gpian_admin_v1";
const ZONE_COOKIE = "gpian_zone_v1";

function store() {
  return getStore(STORE);
}

function token(cookie, secret) {
  try {
    const item = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(secret + "="));
    return item ? decodeURIComponent(item.slice(secret.length + 1)) : "";
  } catch {
    return "";
  }
}

function verify(raw) {
  try {
    const [body, sig] = raw.split(".");
    const secret = process.env.GPIAN_ADMIN_SECRET || "";
    const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function auth(event) {
  const cookies = event.headers?.cookie || "";
  const admin = verify(token(cookies, ADMIN_COOKIE));
  if (admin?.role === "admin") return admin;

  const zone = verify(token(cookies, ZONE_COOKIE));
  if (zone?.role === "zone") return zone;

  return null;
}

function out(body, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    const s = store();

    if (event.httpMethod === "GET") {
      const data = await s.get("published", { type: "json" });
      return out({
        ok: true,
        temoignages: Array.isArray(data) ? data.filter(x => !x.archived) : []
      });
    }

    if (event.httpMethod !== "POST") {
      return out({ ok: false, error: "Méthode non autorisée" }, 405);
    }

    const session = auth(event);
    if (!session) return out({ ok: false, error: "Connexion requise" }, 401);

    if (session.role !== "zone" && session.role !== "admin") {
      return out({ ok: false, error: "Accès refusé" }, 403);
    }

    const body = JSON.parse(event.body || "{}");
    const texte = String(body.texte || "").trim();

    if (!texte || texte.length < 5) {
      return out({ ok: false, error: "Témoignage trop court" }, 400);
    }

    const existing = await s.get("published", { type: "json" });
    const list = Array.isArray(existing) ? existing : [];

    const item = {
      id: crypto.randomUUID(),
      type: "temoignage",
      titre: String(body.titre || "Témoignage").trim().slice(0, 180),
      texte: texte.slice(0, 10000),
      zone: session.role === "zone" ? `Zone ${session.zone}` : "Administration",
      auteur: String(body.auteur || "").trim().slice(0, 120),
      createdAt: new Date().toISOString(),
      archived: false
    };

    list.unshift(item);
    await s.setJSON("published", list);

    return out({ ok: true, temoignage: item }, 201);
  } catch (e) {
    console.error(e);
    return out({ ok: false, error: "Erreur serveur" }, 500);
  }
};

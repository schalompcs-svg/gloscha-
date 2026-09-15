const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function verifierSession(event) {
  try {
    const cookie = event.headers?.cookie || event.headers?.Cookie || "";
    const m = cookie.match(/(?:^|;\s*)gpian_admin=([^;]+)/);

    if (!m) return false;

    const token = decodeURIComponent(m[1]);
    const parts = token.split(".");

    if (parts.length !== 2) return false;

    const exp = Number(parts[0]);
    const sig = parts[1];

    if (!Number.isFinite(exp) || exp < Date.now()) return false;

    const secret = process.env.GPIAN_ADMIN_SECRET;

    if (!secret) {
      console.error("GPIAN_ADMIN_SECRET manquant");
      return false;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(String(exp))
      .digest("hex");

    if (sig.length !== expected.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
  } catch (e) {
    console.error("Erreur vérification session:", e);
    return false;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, {
      ok: false,
      error: "Méthode non autorisée."
    });
  }

  if (!verifierSession(event)) {
    return response(401, {
      ok: false,
      error: "Session administrateur invalide ou expirée. Reconnecte-toi."
    });
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const titre = String(data.titre || "").trim();
    const contenu = String(data.contenu || "").trim();

    if (!titre || !contenu) {
      return response(400, {
        ok: false,
        error: "Titre ou contenu manquant."
      });
    }

    const store = getStore("gpian-predications");

    const id = Date.now().toString();

    const publication = {
      id,
      titre,
      contenu,
      date: data.date || new Date().toISOString()
    };

    await store.setJSON(id, publication);

    console.log("Prédication publiée:", id);

    return response(200, {
      ok: true,
      publication,
      message: "Prédication publiée avec succès."
    });

  } catch (e) {
    console.error("ERREUR PUBLICATION GPIAN:", e);

    return response(500, {
      ok: false,
      error: "Erreur serveur: " + (e?.message || "erreur inconnue")
    });
  }
};

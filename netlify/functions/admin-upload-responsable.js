const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

function cookieValue(event, name) {
  const cookies = event.headers?.cookie || event.headers?.Cookie || "";
  const match = cookies.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function adminAutorise(event) {
  const token = cookieValue(event, "gpian_admin");
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const exp = Number(parts[0]);
  const sig = parts[1];

  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const secret = process.env.GPIAN_ADMIN_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(exp))
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );
}

function slugResponsable(nom) {
  return String(nom)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Méthode non autorisée" })
    };
  }

  if (!adminAutorise(event)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: "Accès administrateur requis" })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const nom = String(data.nom || "").trim();
    const imageBase64 = String(data.image || "");
    const type = String(data.type || "image/jpeg");

    if (!nom || !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Nom ou photo manquant"
        })
      };
    }

    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Format image non autorisé"
        })
      };
    }

    const cleanBase64 = imageBase64
      .replace(/^data:image\/[^;]+;base64,/i, "")
      .replace(/\s/g, "");

    const buffer = Buffer.from(cleanBase64, "base64");

    if (!buffer.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Image invalide"
        })
      };
    }

    if (buffer.length > 3 * 1024 * 1024) {
      return {
        statusCode: 413,
        body: JSON.stringify({
          ok: false,
          error: "Image trop volumineuse"
        })
      };
    }

    const slug = slugResponsable(nom);
    const store = getStore("gpian-responsables");

    await store.set(
      `photos/${slug}`,
      buffer,
      {
        metadata: {
          contentType: type,
          nom,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const manifest = await store.get("manifest", {
      type: "json"
    }) || {};

    manifest[slug] = {
      nom,
      updatedAt: new Date().toISOString()
    };

    await store.setJSON("manifest", manifest);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        ok: true,
        nom,
        slug,
        message: "Photo enregistrée avec succès."
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Erreur serveur pendant l'enregistrement"
      })
    };
  }
};

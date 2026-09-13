const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Requête invalide."
      })
    };
  }
};

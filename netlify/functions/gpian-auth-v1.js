const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "gpian-comptes";
const ADMIN_COOKIE = "gpian_admin_v1";
const ZONE_COOKIE = "gpian_zone_v1";
const SESSION_TTL = 60 * 60 * 8;

function store() {
  return getStore(STORE_NAME);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    try {
      const [salt, hex] = String(stored).split(":");
      if (!salt || !hex) return resolve(false);

      crypto.scrypt(password, salt, 64, (err, derived) => {
        if (err) return resolve(false);
        const a = Buffer.from(hex, "hex");
        const b = Buffer.from(derived.toString("hex"), "hex");
        resolve(a.length === b.length && crypto.timingSafeEqual(a, b));
      });
    } catch {
      resolve(false);
    }
  });
}

function secret() {
  return process.env.GPIAN_ADMIN_SECRET || "";
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readToken(token) {
  try {
    if (!token || !secret()) return null;
    const [body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
    const a = Buffer.from(sig || "", "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function cookie(name, value, maxAge = SESSION_TTL) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function getCookie(event, name) {
  const raw = event.headers?.cookie || event.headers?.Cookie || "";
  const item = raw.split(";").map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

async function bootstrap() {
  const s = store();
  let accounts = await s.get("accounts", { type: "json" });

  if (accounts?.version) return accounts;

  const adminUser = process.env.GPIAN_ADMIN_USER;
  const adminPassword = process.env.GPIAN_ADMIN_PASSWORD;

  if (!adminUser || !adminPassword || !secret()) {
    throw new Error("Variables GPIAN_ADMIN_USER, GPIAN_ADMIN_PASSWORD et GPIAN_ADMIN_SECRET requises");
  }

  const zones = {};
  for (const zone of ["A", "B", "C", "D"]) {
    const user = process.env[`GPIAN_ZONE_${zone}_USER`];
    const password = process.env[`GPIAN_ZONE_${zone}_PASSWORD`];

    if (user && password) {
      zones[zone] = {
        user,
        passwordHash: await hashPassword(password),
        enabled: true
      };
    }
  }

  accounts = {
    version: 1,
    admin: {
      user: adminUser,
      passwordHash: await hashPassword(adminPassword)
    },
    zones,
    updatedAt: new Date().toISOString()
  };

  await s.setJSON("accounts", accounts);
  return accounts;
}

async function getAccounts() {
  const s = store();
  let accounts = await s.get("accounts", { type: "json" });
  if (!accounts?.version) accounts = await bootstrap();
  return accounts;
}

async function saveAccounts(accounts) {
  accounts.updatedAt = new Date().toISOString();
  await store().setJSON("accounts", accounts);
}

function json(body, status = 200, extra = {}) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extra
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    const path = event.path || "";

    if (event.httpMethod === "OPTIONS") {
      return json({ ok: true }, 204);
    }

    if (path.endsWith("/login")) {
      const body = JSON.parse(event.body || "{}");
      const type = body.type === "zone" ? "zone" : "admin";
      const user = String(body.user || "").trim();
      const password = String(body.password || "");

      const accounts = await getAccounts();

      if (type === "admin") {
        if (user !== accounts.admin.user ||
            !(await verifyPassword(password, accounts.admin.passwordHash))) {
          return json({ ok: false, error: "Identifiants incorrects" }, 401);
        }

        const token = sign({
          role: "admin",
          user,
          exp: Date.now() + SESSION_TTL * 1000
        });

        return json(
          { ok: true, role: "admin", user },
          200,
          { "Set-Cookie": cookie(ADMIN_COOKIE, token) }
        );
      }

      for (const zone of ["A", "B", "C", "D"]) {
        const z = accounts.zones?.[zone];
        if (
          z?.enabled &&
          user === z.user &&
          await verifyPassword(password, z.passwordHash)
        ) {
          const token = sign({
            role: "zone",
            zone,
            user,
            exp: Date.now() + SESSION_TTL * 1000
          });

          return json(
            { ok: true, role: "zone", zone },
            200,
            { "Set-Cookie": cookie(ZONE_COOKIE, token) }
          );
        }
      }

      return json({ ok: false, error: "Identifiants incorrects" }, 401);
    }

    if (path.endsWith("/session")) {
      const admin = readToken(getCookie(event, ADMIN_COOKIE));
      if (admin?.role === "admin") {
        return json({ authenticated: true, role: "admin", user: admin.user });
      }

      const zone = readToken(getCookie(event, ZONE_COOKIE));
      if (zone?.role === "zone") {
        return json({
          authenticated: true,
          role: "zone",
          zone: zone.zone,
          user: zone.user
        });
      }

      return json({ authenticated: false }, 401);
    }

    if (path.endsWith("/logout")) {
      return json(
        { ok: true },
        200,
        {
          "Set-Cookie": [
            cookie(ADMIN_COOKIE, "", 0),
            cookie(ZONE_COOKIE, "", 0)
          ]
        }
      );
    }

    if (path.endsWith("/settings")) {
      const session = readToken(getCookie(event, ADMIN_COOKIE));
      if (session?.role !== "admin") {
        return json({ ok: false, error: "Administration requise" }, 403);
      }

      if (event.httpMethod === "GET") {
        const accounts = await getAccounts();

        const zones = {};
        for (const zone of ["A", "B", "C", "D"]) {
          if (accounts.zones?.[zone]) {
            zones[zone] = {
              user: accounts.zones[zone].user,
              enabled: accounts.zones[zone].enabled
            };
          } else {
            zones[zone] = { user: "", enabled: false };
          }
        }

        return json({
          ok: true,
          admin: { user: accounts.admin.user },
          zones
        });
      }

      if (event.httpMethod === "POST") {
        const body = JSON.parse(event.body || "{}");
        const accounts = await getAccounts();

        if (body.admin?.user) {
          accounts.admin.user = String(body.admin.user).trim();
        }

        if (body.admin?.password) {
          accounts.admin.passwordHash =
            await hashPassword(String(body.admin.password));
        }

        for (const zone of ["A", "B", "C", "D"]) {
          const input = body.zones?.[zone];
          if (!input) continue;

          if (!accounts.zones) accounts.zones = {};

          if (!accounts.zones[zone]) {
            accounts.zones[zone] = {
              user: "",
              passwordHash: "",
              enabled: false
            };
          }

          if (input.user) {
            accounts.zones[zone].user = String(input.user).trim();
          }

          if (input.password) {
            accounts.zones[zone].passwordHash =
              await hashPassword(String(input.password));
          }

          if (typeof input.enabled === "boolean") {
            accounts.zones[zone].enabled = input.enabled;
          }
        }

        await saveAccounts(accounts);
        return json({ ok: true, message: "Comptes mis à jour" });
      }
    }

    return json({ ok: false, error: "Route inconnue" }, 404);
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Erreur serveur" }, 500);
  }
};

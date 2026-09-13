exports.handler = async (event) => {
  const number = "22901529191";

  const body = JSON.parse(event.body || "{}");

  const zone = String(body.zone || "GPIAN").trim();
  const type = String(body.type || "Information").trim();
  const titre = String(body.titre || "").trim();
  const message = String(body.message || "").trim();

  const text =
`GPIAN — NOUVELLE SOUMISSION

Zone : ${zone}
Type : ${type}
Titre : ${titre}

${message}

Merci — Administration GPIAN`;

  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ok: true,
      whatsapp: url,
      destination: number
    })
  };
};

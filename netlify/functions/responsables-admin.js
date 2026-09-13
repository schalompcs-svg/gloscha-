const { getStore } = require("@netlify/blobs");

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

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return response(405, { ok:false, error:"Méthode non autorisée" });
  }

  const store = getStore("gpian-responsables");

  try {
    if (event.httpMethod === "GET") {
      const { blobs } = await store.list();
      const responsables = [];

      for (const blob of blobs) {
        const data = await store.get(blob.key, { type:"json" });
        if (data) responsables.push(data);
      }

      return response(200, { ok:true, responsables });
    }

    const data = JSON.parse(event.body || "{}");

    if (!data.eglise || !data.nom) {
      return response(400, {
        ok:false,
        error:"L'église et le nom du responsable sont obligatoires."
      });
    }

    const id = String(data.slug || data.eglise)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-|-$/g,"");

    const responsable = {
      eglise: data.eglise,
      nom: data.nom,
      fonction: data.fonction || "Pasteur",
      telephone: data.telephone || "",
      adresse: data.adresse || "",
      photo: data.photo || "",
      slug: id,
      updatedAt: new Date().toISOString()
    };

    await store.setJSON(id, responsable);

    return response(200, {
      ok:true,
      message:"Affectation enregistrée avec succès.",
      responsable
    });

  } catch (error) {
    console.error(error);

    return response(500, {
      ok:false,
      error:"Erreur serveur lors de l'enregistrement."
    });
  }
};

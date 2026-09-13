const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    const slug = String(event.queryStringParameters?.slug || "").trim();

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        body: "Photo invalide"
      };
    }

    const store = getStore("gpian-responsables");

    const result = await store.getWithMetadata(
      `photos/${slug}`,
      { type: "arrayBuffer" }
    );

    if (!result || !result.data) {
      return {
        statusCode: 404,
        headers: {
          "Cache-Control": "no-store"
        },
        body: "Photo introuvable"
      };
    }

    const contentType =
      result.metadata?.contentType || "image/jpeg";

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300"
      },
      body: Buffer.from(result.data).toString("base64")
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: "Erreur serveur"
    };
  }
};

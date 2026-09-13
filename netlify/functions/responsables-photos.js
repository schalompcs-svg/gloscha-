const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("gpian-responsables");

    const manifest = await store.get("manifest", {
      type: "json"
    }) || {};

    const photos = {};

    for (const slug of Object.keys(manifest)) {
      photos[slug] =
        `/.netlify/functions/responsable-photo?slug=${encodeURIComponent(slug)}`;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        ok: true,
        photos
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ok: false,
        photos: {}
      })
    };
  }
};

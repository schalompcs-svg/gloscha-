const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("gpian-predications");
    const { blobs } = await store.list();

    const result = [];

    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: "json" });
      if (data) result.push(data);
    }

    result.sort((a,b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ ok:true, predications:result })
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok:false, error:"Impossible de charger les prédications." })
    };
  }
};

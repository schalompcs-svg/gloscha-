export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok:false });
  }

  const { username, password } = req.body || {};

  if (
    username === process.env.GPIAN_ADMIN_USER &&
    password === process.env.GPIAN_ADMIN_PASSWORD
  ) {
    return res.status(200).json({ ok:true });
  }

  return res.status(401).json({ ok:false });
}

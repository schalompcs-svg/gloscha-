// Legacy compatibility helper. Authentication is handled by netlify/functions/admin-login.js.
module.exports = async function adminLoginLegacy(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Méthode non autorisée'});
  return res.status(410).json({ok:false,error:'Endpoint obsolète. Utilisez /.netlify/functions/admin-login.'});
};

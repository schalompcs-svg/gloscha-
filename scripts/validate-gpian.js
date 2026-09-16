const fs = require('fs');

const required = [
  'www/index.html',
  'www/admin5.html',
  'www/assets/gpian-runtime.js',
  'www/assets/pasteurs/zones-affectations.json',
  'electron/main.js',
  'forge.config.js'
];

let ok = true;

for (const file of required) {
  if (fs.existsSync(file)) {
    console.log(`OK: ${file}`);
  } else {
    console.error(`ERREUR: fichier manquant: ${file}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('GPIAN MAX: validation réussie.');

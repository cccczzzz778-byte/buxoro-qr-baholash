import { access, readFile } from 'node:fs/promises';
const required=['public/index.html','public/login.html','public/dashboard.html','public/analytics.html','public/register.html','public/registry.html','public/offline.html','public/manifest.webmanifest','public/sw.js','public/assets/professional-v3.css','public/assets/shell.js','server/application.mjs','server/security.mjs'];
for (const file of required) await access(file);
const pkg=JSON.parse(await readFile('package.json','utf8'));
if(pkg.version!=='3.0.0') throw new Error('Unexpected version');
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
if(!manifest.icons?.length) throw new Error('PWA icons missing');
console.log(`Check OK — ${pkg.name} v${pkg.version}, ${required.length} critical files verified.`);

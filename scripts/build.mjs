import { cp, rm, access } from 'node:fs/promises';
for (const file of ['public/index.html','public/dashboard.html','public/login.html','public/poster.html','server/application.mjs','server/migrations/0000_initial.sql']) await access(file);
await rm('dist',{recursive:true,force:true});
await cp('public','dist',{recursive:true});
console.log('Static frontend ready in dist/.');

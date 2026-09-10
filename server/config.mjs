import { existsSync, readFileSync } from 'node:fs';
const path = new URL('./runtime-config.json', import.meta.url);
if (existsSync(path)) {
  const config = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','ADMIN_USERNAME','ADMIN_PASSWORD','SESSION_SECRET','PUBLIC_BASE_URL']) {
    if (!process.env[key] && typeof config[key] === 'string') process.env[key] = config[key];
  }
}

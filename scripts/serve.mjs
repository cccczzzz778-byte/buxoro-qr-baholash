import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import application, { securityHeaders } from '../server/application.mjs';
import districtApplication from '../server/district-application.mjs';
import authAnalyticsApplication from '../server/auth-analytics-application.mjs';
import adminFeedbackDelete from '../server/admin-feedback-delete.mjs';
import analyticsComplaints from '../server/analytics-complaints.mjs';
import feedbackSubmit from '../server/feedback-submit.mjs';
import { closeDatabase, database } from '../server/database.mjs';
import { secret } from '../server/security.mjs';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.txt':'text/plain; charset=utf-8' };
export function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (/^\/api\/admin\/feedback\/[^/]+\/?$/.test(url.pathname) && req.method === 'DELETE') return adminFeedbackDelete(req,res);
      if ((url.pathname === '/api/feedback' || url.pathname === '/api/feedback/') && req.method === 'POST') return feedbackSubmit(req,res);
      if (url.pathname === '/api/analytics/complaints' || url.pathname === '/api/analytics/complaints/') return analyticsComplaints(req,res);
      if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/analytics/')) return authAnalyticsApplication(req,res);
      if (url.pathname.startsWith('/api/district/')) return districtApplication(req,res);
      if (url.pathname.startsWith('/api/')) return application(req,res);
      if (/^\/qr\/[^/]+\.(png|svg)$/.test(url.pathname)) {
        req.url = '/api/legacy-qr/' + url.pathname.slice(4) + url.search;
        return application(req,res);
      }
      securityHeaders(res);
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      let path = decodeURIComponent(url.pathname);
      if (path === '/' || path === '/feedback' || /^\/(feedback|r)\/[^/]+\/?$/.test(path)) path = '/index.html';
      if (['/dashboard','/admin'].includes(path)) path = '/dashboard.html';
      if (path === '/login') path = '/login.html';
      if (/^\/poster\/[^/]+\/?$/.test(path)) path = '/poster.html';
      const full = resolve(root, '.'+path);
      if (!full.startsWith(root) || path.includes('\0') || !types[extname(full)]) { res.writeHead(404); return res.end('Sahifa topilmadi'); }
      const data = await readFile(full);
      res.setHeader('Content-Type', types[extname(full)]);
      res.setHeader('Cache-Control','no-cache');
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Sahifa topilmadi'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { secret(); await database(); }
  catch (error) { console.error('Server sozlanmagan. Xato:', error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[database]')); process.exit(1); }
  const server = createAppServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port,'0.0.0.0', () => console.log(`Buxoro QR started on port ${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await closeDatabase(); process.exit(0); }));
}

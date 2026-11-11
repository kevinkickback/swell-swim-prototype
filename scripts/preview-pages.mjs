import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../public/', import.meta.url)));
const base = '/swell-swim-prototype/';
const port = Number(process.env.PAGES_PREVIEW_PORT ?? 5174);
const contentTypes = new Map(Object.entries({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}));

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/' || pathname === base.slice(0, -1)) {
      response.writeHead(302, { Location: base }).end();
      return;
    }
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }

    const relativePath = pathname.slice(base.length);
    const file = !relativePath || relativePath.endsWith('/')
      ? `${relativePath}index.html`
      : relativePath;
    const target = await realpath(resolve(root, file));
    if (!target.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }

    const body = await readFile(target);
    const type = contentTypes.get(extname(target)) ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Swell Swim preview: http://127.0.0.1:${server.address().port}${base}`);
});

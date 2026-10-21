import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'dist');
const catalogFile = join(root, 'server', 'data', 'neo-catalog.json');
const port = Number(process.env.PORT || 4173);
const seeds = [
  { id: '99942', name: 'Apophis', kind: 'Asteroid', orbitClass: 'Aten', diameter: '310–340 m', h: '19.7', moid: '0.0007 AU', pha: true, visited: false, a: 0.922, e: 0.191 },
  { id: '101955', name: 'Bennu', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '492 m', h: '20.9', moid: '0.0032 AU', pha: true, visited: true, a: 1.126, e: 0.204 },
  { id: '162173', name: 'Ryugu', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '900 m', h: '19.2', moid: '0.0008 AU', pha: true, visited: true, a: 1.189, e: 0.191 },
  { id: '65803', name: 'Didymos', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '780 m', h: '18.2', moid: '0.039 AU', pha: false, visited: true, a: 1.644, e: 0.384 },
];
let catalog = seeds;
let catalogUpdated = null;
let closeApproaches = null;
let approachesUpdated = 0;

async function loadCatalog() {
  if (existsSync(catalogFile)) {
    const file = JSON.parse(await readFile(catalogFile, 'utf8'));
    if (Array.isArray(file.data)) {
      catalog = file.data;
      catalogUpdated = file.updatedAt || null;
    }
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}

async function getApproaches() {
  if (closeApproaches && Date.now() - approachesUpdated < 60 * 60 * 1000) return closeApproaches;
  const start = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 3652 * 86400000).toISOString().slice(0, 10);
  const url = new URL('https://ssd-api.jpl.nasa.gov/cad.api');
  url.search = new URLSearchParams({ 'date-min': start, 'date-max': end, 'dist-max': '0.05', sort: 'date', limit: '100', 'fullname': 'true' }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`JPL CAD returned HTTP ${response.status}`);
  const result = await response.json();
  if (result.error || !Array.isArray(result.data)) throw new Error(result.error || 'JPL CAD response did not contain approach data');
  closeApproaches = result.data.map(row => Object.fromEntries(result.fields.map((field, i) => [field, row[i]])));
  approachesUpdated = Date.now();
  return closeApproaches;
}

const missions = [
  { name: 'DART', year: 2022, target: '65803 Didymos', status: 'completed', event: 'Kinetic impact test' },
  { name: 'OSIRIS-REx', year: 2023, target: '101955 Bennu', status: 'completed', event: 'Sample return' },
  { name: 'Hayabusa2', year: 2020, target: '162173 Ryugu', status: 'completed', event: 'Sample return' },
  { name: 'Lucy', year: 2027, target: 'Jupiter trojans', status: 'en route', event: 'Trojan flyby' },
  { name: 'Psyche', year: 2029, target: '16 Psyche', status: 'en route', event: 'Orbital insertion' },
  { name: 'NEO Surveyor', year: 2027, target: 'Near-Earth objects', status: 'planned', event: 'Infrared survey' },
];

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' });
    return res.end();
  }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/^\/api(?=\/)/, '');
  try {
    if (path === '/health') return json(res, 200, { status: 'ok', catalogCount: catalog.length, catalogUpdated });
    if (path === '/neo/list') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const kind = url.searchParams.get('kind');
      const pha = url.searchParams.get('pha');
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 50)));
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
      const rows = catalog.filter(item => (!q || `${item.name} ${item.id} ${item.orbitClass}`.toLowerCase().includes(q))
        && (!kind || item.kind.toLowerCase() === kind.toLowerCase())
        && (pha === null || String(item.pha) === pha));
      return json(res, 200, { total: rows.length, offset, limit, source: catalogUpdated ? 'JPL SBDB snapshot' : 'bundled seed', updatedAt: catalogUpdated, data: rows.slice(offset, offset + limit) });
    }
    const objectMatch = path.match(/^\/neo\/([^/]+)$/);
    if (objectMatch) {
      const item = catalog.find(entry => String(entry.id) === decodeURIComponent(objectMatch[1]) || entry.name.toLowerCase() === decodeURIComponent(objectMatch[1]).toLowerCase());
      return item ? json(res, 200, item) : json(res, 404, { error: 'Near-Earth object not found' });
    }
    if (path === '/close-approaches/next') {
      try {
        const data = await getApproaches();
        return json(res, 200, { source: 'JPL CNEOS CAD API', data });
      } catch (error) {
        return json(res, 502, { error: 'Could not retrieve close approaches from JPL CNEOS', detail: error.message });
      }
    }
    if (path === '/missions') return json(res, 200, { data: missions });
    const ephMatch = path.match(/^\/ephemeris\/([^/]+)$/);
    if (ephMatch) {
      const item = catalog.find(entry => String(entry.id) === decodeURIComponent(ephMatch[1]) || entry.name.toLowerCase() === decodeURIComponent(ephMatch[1]).toLowerCase());
      if (!item) return json(res, 404, { error: 'Near-Earth object not found' });
      const start = new Date(url.searchParams.get('start') || Date.now());
      const end = new Date(url.searchParams.get('end') || start.getTime() + 30 * 86400000);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return json(res, 400, { error: 'Provide valid start and end dates, with end after start.' });
      const span = Math.min(end - start, 10 * 365 * 86400000);
      const samples = Array.from({ length: 101 }, (_, i) => {
        const epoch = new Date(start.getTime() + span * i / 100);
        const angle = i * Math.PI * 2 / 100;
        const radius = Number(item.a || 1) * (1 - Number(item.e || 0) ** 2) / (1 + Number(item.e || 0) * Math.cos(angle));
        return { epoch: epoch.toISOString(), x: radius * Math.cos(angle), y: 0, z: radius * Math.sin(angle) };
      });
      return json(res, 200, { id: item.id, source: 'simplified two-body approximation; not for navigation', data: samples });
    }
    if (path === '/' && existsSync(join(publicDir, 'index.html'))) {
      const html = await readFile(join(publicDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    const asset = resolve(publicDir, `.${path}`);
    if ((asset === publicDir || asset.startsWith(`${publicDir}${sep}`)) && existsSync(asset)) {
      const contentTypes = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'content-type': contentTypes[extname(asset)] || 'application/octet-stream' });
      return res.end(await readFile(asset));
    }
    if (existsSync(join(publicDir, 'index.html'))) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await readFile(join(publicDir, 'index.html')));
    }
    return json(res, 404, { error: 'Not found. Build the frontend with npm run build.' });
  } catch (error) {
    console.error('Request failed:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
});

await loadCatalog();
server.listen(port, '0.0.0.0', () => console.log(`Xasteroids API and web server listening on :${port}`));

if (process.env.JPL_AUTO_INGEST === 'true') {
  const refreshCatalog = () => execFile(process.execPath, [join(root, 'server', 'ingest.js')], { timeout: 90000 }, async (error, stdout, stderr) => {
    if (error) {
      console.error('Scheduled JPL catalog refresh failed:', stderr || error.message);
      return;
    }
    console.log(stdout.trim());
    await loadCatalog();
  });
  refreshCatalog();
  setInterval(refreshCatalog, 12 * 60 * 60 * 1000);
}

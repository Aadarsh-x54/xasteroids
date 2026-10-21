import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const url = new URL('https://ssd-api.jpl.nasa.gov/sbdb_query.api');
url.search = new URLSearchParams({
  'sb-kind': 'a',
  'sb-class': 'IEO,ATE,APO,AMO',
  fields: 'spkid,full_name,kind,H,diameter,moid,a,e,class',
  limit: '50000',
}).toString();

const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`JPL SBDB query failed: HTTP ${response.status}`);
const result = await response.json();
if (result.error || !Array.isArray(result.fields) || !Array.isArray(result.data)) {
  throw new Error(result.error || 'JPL SBDB returned an unexpected response.');
}

const rows = result.data.map(row => Object.fromEntries(result.fields.map((field, index) => [field, row[index]])));
const numberValue = value => value === null || value === undefined || value === '' ? Number.NaN : Number(value);
const catalog = rows.map(row => {
  const h = numberValue(row.H);
  const moid = numberValue(row.moid);
  return {
    id: row.spkid,
    name: row.full_name,
    kind: row.kind === 'C' ? 'Comet' : 'Asteroid',
    orbitClass: row.class || 'Near-Earth object',
    h: row.H,
    diameter: numberValue(row.diameter),
    moid,
    a: numberValue(row.a),
    e: numberValue(row.e),
    pha: Number.isFinite(moid) && Number.isFinite(h) && moid <= 0.05 && h <= 22,
    source: 'JPL SBDB',
  };
}).filter(row => row.id && row.name);

const output = { source: 'JPL Small-Body Database Query API', updatedAt: new Date().toISOString(), count: catalog.length, data: catalog };
await mkdir(join(dir, 'data'), { recursive: true });
await writeFile(join(dir, 'data', 'neo-catalog.json'), `${JSON.stringify(output)}\n`);
console.log(`Saved ${catalog.length} near-Earth objects from JPL SBDB.`);

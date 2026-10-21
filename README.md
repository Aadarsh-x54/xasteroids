# Xasteroids

**The asteroid neighborhood, live.** Xasteroids is an independently branded, dark-mode solar-system explorer for learning about near-Earth objects, close approaches, and planetary-defense missions.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server serves the interactive client at `http://localhost:5173`. Run the Node API in a second terminal to enable full-catalog search and live close approaches while developing. To run the production web server and API together:

```sh
npm run build
npm run start:api
```

Open `http://localhost:4173`. Node.js 20 or newer is recommended. No credentials are needed to build or run the bundled experience.

## What is included

- Responsive React + TypeScript client and Three.js solar-system scene, including 42,000 procedurally generated background points, orbit controls, object selection, search, filters, and a date/speed control.
- Curated, educational object and mission records for featured bodies, a close-approach view, and four short learning stories.
- Node.js HTTP API for paginated NEO search, object lookup, close approaches, mission metadata, and sampled orbit paths.
- Optional catalog ingestion from the public JPL Small-Body Database Query API, with a 12-hour refresh mode.
- Static production serving, installable PWA shell, a Docker image, and a GitHub Actions build workflow.

## Data quality and scientific scope

The initial client is self-contained and renders immediately. Its background points and sample orbit paths are **procedural illustrations**, not a downloaded set of 42,000 measured ephemerides. Featured names and selected object properties are educational seed values; the current client does not claim that its point cloud or animated positions are authoritative. The UI labels the scene as simplified and warns against use for navigation or impact-risk assessment.

The included `server/data/neo-catalog.json` snapshot contains 42,795 near-Earth objects retrieved from JPL SBDB on 2026-10-21. To refresh it from JPL, run:

```sh
npm run ingest
```

The included catalog is a generated snapshot; running ingestion replaces it with a current version. Set `JPL_AUTO_INGEST=true` in the server environment to refresh the local snapshot on startup and every 12 hours. The application API uses JPL's public CAD API for requested close-approach data; upstream failures are returned as explicit `502` responses rather than presented as current data.

The ephemeris endpoint returns a simplified two-body sample path and explicitly labels it as unsuitable for navigation. For scientifically rigorous positions, integrate JPL Horizons vectors / state vectors and uncertainty-aware orbit solutions, store the requested epochs and provenance, and have the client interpolate those precomputed results. Do not infer impact risk from the visual scene.

## API

All endpoints are same-origin and accept an optional `/api` prefix.

| Endpoint | Description |
|---|---|
| `GET /neo/list?limit=50&offset=0&q=bennu&kind=Asteroid&pha=true` | Filtered, paginated catalog |
| `GET /neo/{id-or-name}` | Object details |
| `GET /close-approaches/next` | Next decade of JPL CAD approaches within 0.05 AU |
| `GET /ephemeris/{id-or-name}?start=2025-01-01&end=2025-02-01` | 101 illustrative samples (maximum 10-year interval) |
| `GET /missions` | Mission metadata |
| `GET /health` | Server and catalog status |

The catalog list accepts `limit` (1–500), `offset`, `q`, `kind`, and `pha` query parameters. Ingestion requires outbound network access to `ssd-api.jpl.nasa.gov`; the public APIs may change their terms, limits, or availability, so production operators should review their documentation and cache responsibly.

## Deployment

Build the container with `docker build -t xasteroids .`, then run `docker run --rm -p 4173:4173 -e JPL_AUTO_INGEST=true xasteroids`. Persistent catalog snapshots require a mounted volume at `/app/server/data` when using scheduled ingestion. For a static deployment, build with `npm run build` and serve `dist/`; deploy the Node API separately and configure a same-origin reverse proxy for the API routes.

## Extending the experience

- Add or update curated presentation metadata in `src/data.ts`; use JPL SBDB values for authoritative physical/orbit data and make source and epoch clear.
- Add mission entries to the `missions` collections in `src/data.ts` and `server/index.js`; use verified mission dates and distinguish completed, active, and planned events.
- Add a learning story in `src/App.tsx`'s `storyIndex` content and update the four-step progress controls together.
- Push notifications, VR/AR, user-uploaded observations, and object size comparisons are intentionally deferred.

## Accessibility and controls

Drag to rotate, scroll/pinch to zoom, click a featured object to inspect it, `/` focuses search, `Space` plays/pauses time, and `L` returns to live. Controls are keyboard reachable, panels have accessible labels, and reduced-motion preferences are respected.

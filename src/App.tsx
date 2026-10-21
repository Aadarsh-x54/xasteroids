import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Compass, Crosshair, ExternalLink, Eye, Gauge, Globe2, Info, Layers3,
  ListFilter, LocateFixed, Menu, Orbit, Pause, Play, Plus, Radio, Search, Shield,
  SlidersHorizontal, Sparkles, Telescope, X,
} from 'lucide-react';
import { missions, objects } from './data';
import type { SpaceObject } from './data';

const Scene = lazy(() => import('./Scene'));
type Filter = 'All objects' | 'Asteroids' | 'Comets' | 'Potentially hazardous' | 'Visited';
const filters: Filter[] = ['All objects', 'Asteroids', 'Comets', 'Potentially hazardous', 'Visited'];
const today = new Date();
const dateLabel = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(date);

function apiObject(value: unknown): SpaceObject | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if ((typeof row.id !== 'string' && typeof row.id !== 'number') || typeof row.name !== 'string') return null;
  const toNumber = (value: unknown) => value === null || value === undefined || value === '' ? Number.NaN : Number(value);
  const kind = String(row.kind || '').toLowerCase().includes('comet') || row.kind === 'C' ? 'Comet' : 'Asteroid';
  const h = toNumber(row.h);
  const moid = toNumber(row.moid);
  const a = toNumber(row.a);
  const e = toNumber(row.e);
  const id = String(row.id);
  const pha = row.pha === true || row.pha === 'true';
  const color = pha ? '#ff846d' : kind === 'Comet' ? '#eaf8ff' : '#78bafa';
  const phase = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) * 0.13;
  const diameter = toNumber(row.diameter);
  return {
    id,
    name: row.name,
    kind,
    orbitClass: typeof row.orbitClass === 'string' ? row.orbitClass : 'Near-Earth object',
    diameter: Number.isFinite(diameter) ? `${diameter} km` : 'Not available',
    h: Number.isFinite(h) ? h.toFixed(1) : '—',
    moid: Number.isFinite(moid) ? `${moid.toFixed(4)} AU` : '—',
    pha,
    visited: false,
    a: Number.isFinite(a) ? a : 1,
    e: Number.isFinite(e) ? e : 0.1,
    phase,
    color,
    next: '—',
    nextDistance: '—',
  };
}

function App() {
  const [selected, setSelected] = useState<string | null>('Apophis');
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(true);
  const [filter, setFilter] = useState<Filter>('All objects');
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simDate, setSimDate] = useState(today);
  const [showMissions, setShowMissions] = useState(true);
  const [showLearn, setShowLearn] = useState(false);
  const [watch, setWatch] = useState(false);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Orbit' | 'Close approach'>('Overview');
  const [panelOpen, setPanelOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [remoteResults, setRemoteResults] = useState<SpaceObject[] | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSimDate(d => new Date(d.getTime() + 250 * 86400000 / 24000 * speed));
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (event.code === 'Space') { event.preventDefault(); setPlaying(p => !p); }
      if (event.key.toLowerCase() === 'l') { setSimDate(new Date()); setPlaying(false); }
      if (event.key === 'Escape') { setShowLearn(false); setShowHelp(false); }
      if (event.key === '/') { event.preventDefault(); document.querySelector<HTMLInputElement>('.search-input')?.focus(); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRemoteResults(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/neo/list?q=${encodeURIComponent(term)}&limit=100`);
        if (!response.ok) throw new Error(`Catalog API returned HTTP ${response.status}`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
          throw new Error('Catalog API returned an invalid response.');
        }
        const mapped = payload.data.map(apiObject).filter((item): item is SpaceObject => item !== null);
        if (active) setRemoteResults(mapped);
      } catch (error) {
        if (active) {
          setRemoteResults(null);
          console.warn('Full-catalog search is unavailable; showing bundled featured objects.', error);
        }
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/watch\/([^/]+)/);
      if (match) setSelected(decodeURIComponent(match[1]));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectedObject = [...objects, ...(remoteResults ?? [])].find(o => o.name === selected) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catalog = remoteResults ? [...objects, ...remoteResults] : objects;
    const seen = new Set<string>();
    return catalog.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      const matches = !q || `${o.name} ${o.id} ${o.orbitClass}`.toLowerCase().includes(q);
      const kind = filter === 'Asteroids' ? o.kind === 'Asteroid'
        : filter === 'Comets' ? o.kind === 'Comet'
          : filter === 'Potentially hazardous' ? o.pha
            : filter === 'Visited' ? o.visited : true;
      return matches && kind;
    });
  }, [query, filter, remoteResults]);

  const chooseObject = (name: string) => {
    setSelected(name);
    setWatch(false);
    const slug = encodeURIComponent(name);
    window.history.replaceState({}, '', `/watch/${slug}`);
  };

  const setTimeFromRange = (value: string) => {
    const year = 2020 + Number(value) / 100 * 15;
    const d = new Date(Date.UTC(Math.floor(year), Math.round((year % 1) * 12), 1));
    setSimDate(d);
    setPlaying(false);
  };

  const rangeValue = Math.max(0, Math.min(100, ((simDate.getTime() - Date.UTC(2020, 0, 1)) / (Date.UTC(2035, 0, 1) - Date.UTC(2020, 0, 1))) * 100));
  const speeds = [1, 10, 100, 1000];

  return (
    <main className="app-shell">
      <Suspense fallback={null}><Scene selected={selected} onSelect={chooseObject} playing={playing} speed={speed} date={simDate} onReady={() => setLoaded(true)} /></Suspense>
      {!loaded && <div className="loading-screen"><div className="brand-mark large"><Orbit size={30} /></div><div className="loading-title">XASTEROIDS</div><div className="loading-bar"><i /></div><span>Mapping our cosmic neighborhood…</span></div>}
      <div className="scene-vignette" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="Xasteroids home" onClick={e => { e.preventDefault(); setSelected(null); }}>
          <span className="brand-mark"><Orbit size={20} strokeWidth={1.8} /></span>
          <span className="brand-word">XASTEROIDS<span className="brand-period">.</span><small>THE ASTEROID NEIGHBORHOOD, LIVE</small></span>
        </a>
        <div className="top-center"><span className="live-indicator"><i /> SIMULATION READY</span><span className="top-divider" /><span className="catalog-number">42,000 <span>ORBITAL POINTS</span></span></div>
        <nav className="top-actions">
          <button className={`nav-button ${showMissions ? 'active' : ''}`} onClick={() => setShowMissions(v => !v)}><Layers3 size={16} /> <span>Missions</span></button>
          <button className={`nav-button ${showLearn ? 'active' : ''}`} onClick={() => setShowLearn(v => !v)}><Sparkles size={16} /> <span>Explore</span></button>
          <button className="icon-button help-button" aria-label="Keyboard shortcuts and help" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button>
          <button className="icon-button menu-button" aria-label="Open menu" onClick={() => setPanelOpen(p => !p)}><Menu size={18} /></button>
        </nav>
      </header>

      <aside className="left-rail">
        <button className={`rail-button ${watch ? 'selected' : ''}`} onClick={() => { setWatch(v => !v); setSelected('Apophis'); }} title="Asteroid Watch"><Crosshair size={18} /><span>WATCH</span></button>
        <button className="rail-button" onClick={() => setShowMissions(v => !v)} title="Toggle missions"><Layers3 size={18} /><span>LAYERS</span></button>
        <button className="rail-button" onClick={() => setShowLearn(v => !v)} title="Learn about near-Earth objects"><Telescope size={18} /><span>LEARN</span></button>
        <div className="rail-spacer" />
        <button className="rail-button" onClick={() => setShowHelp(true)} title="Controls"><Compass size={18} /><span>CONTROLS</span></button>
      </aside>

      <section className={`search-panel ${mobileCatalogOpen ? '' : 'mobile-hidden'}`} aria-label="Object search and filters">
        <div className="searchbox"><Search size={17} /><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an asteroid or comet…" aria-label="Search objects" /><kbd>/</kbd></div>
        <div className="filter-scroll" role="group" aria-label="Filter catalog">
          {filters.map(item => <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item === 'Potentially hazardous' && <Shield size={12} />}{item === 'Visited' && <Telescope size={12} />}{item}</button>)}
        </div>
        <div className="catalog-list-head"><span>{query || filter !== 'All objects' ? `${filtered.length} MATCHING OBJECTS` : 'FEATURED OBJECTS'}</span><SlidersHorizontal size={13} /></div>
        <div className="object-list">
          {filtered.length ? filtered.slice(0, 7).map(o => <ObjectRow key={o.id} item={o} active={selected === o.name} onClick={() => chooseObject(o.name)} />) : <div className="no-results">No matching objects. Try a designation or orbit class.</div>}
        </div>
        <button className="catalog-footer" onClick={() => setQuery('')}>EXPLORE CATALOG <ArrowUpRight size={13} /></button>
      </section>

      <div className="scene-hud hud-distance"><span className="hud-dot" /> SOLAR SYSTEM <span className="hud-slash">/</span> INNER PLANETS <span className="hud-coords">HELIOCENTRIC · AU</span></div>
      <div className="scale-indicator"><span>0</span><i /><span>1 AU</span></div>
      {showMissions && <section className="mission-card">
        <div className="card-kicker"><span><Radio size={13} /> MISSION CONTROL</span><button className="tiny-close" onClick={() => setShowMissions(false)} aria-label="Hide missions"><X size={14} /></button></div>
        <div className="mission-header"><div><h2>Journeys to<br />small worlds.</h2><p>Past, present & what comes next.</p></div><div className="mission-orbit"><Orbit size={39} /></div></div>
        <div className="mission-list">{missions.slice(0, 4).map((mission, i) => <button className="mission-item" key={mission.name} onClick={() => mission.object !== 'Jupiter' && chooseObject(mission.object)}><span className={`mission-icon mission-${i}`}><span /></span><span className="mission-copy"><b>{mission.name}</b><small>{mission.detail}</small></span><span className="mission-year">{mission.year}</span><ChevronRight size={14} /></button>)}</div>
        <button className="mission-all" onClick={() => setShowLearn(true)}>MISSION TIMELINE <ArrowUpRight size={13} /></button>
      </section>}

      {watch && <section className="watch-card"><div className="watch-title"><span><Crosshair size={15} /> ASTEROID WATCH</span><button className="tiny-close" onClick={() => setWatch(false)} aria-label="Close watch mode"><X size={14} /></button></div><h2>Next close approaches</h2><p className="watch-note">Objects passing within 0.05 AU of Earth</p>{objects.filter(o => o.pha).slice(0, 4).map(o => <button className="approach-row" key={o.id} onClick={() => { chooseObject(o.name); setActiveTab('Close approach'); }}><span className="approach-alert"><i /></span><span className="approach-copy"><b>{o.name}</b><small>{o.next}</small></span><strong>{o.nextDistance}</strong></button>)}</section>}

      {selectedObject && panelOpen && <aside className="detail-panel">
        <div className="detail-topline"><span className="eyebrow"><span className="object-dot" style={{ background: selectedObject.color }} /> {selectedObject.kind.toUpperCase()} <span className="eyebrow-sep">/</span> {selectedObject.orbitClass.toUpperCase()}</span><button className="icon-button panel-close" onClick={() => setPanelOpen(false)} aria-label="Close details"><X size={16} /></button></div>
        <div className="object-heading"><div><h1>{selectedObject.name}</h1><p>Minor planet <span>·</span> {selectedObject.id}</p></div><button className="focus-button" onClick={() => setWatch(true)} aria-label="Focus object"><LocateFixed size={17} /></button></div>
        <div className="detail-tabs" role="tablist">{(['Overview', 'Orbit', 'Close approach'] as const).map(tab => <button role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
        {activeTab === 'Overview' && <><div className="object-visual"><div className="object-moon" style={{ background: `radial-gradient(circle at 33% 30%, #fff8, ${selectedObject.color} 29%, #17202e 75%)`, boxShadow: `0 0 50px ${selectedObject.color}30` }} /><div className="visual-orbit" /><span className="visual-caption">ARTIST’S IMPRESSION <Info size={11} /></span></div>
          <div className="stat-grid"><Stat label="EST. DIAMETER" value={selectedObject.diameter} /><Stat label="ABS. MAGNITUDE" value={`H ${selectedObject.h}`} /><Stat label="MOID" value={selectedObject.moid} /><Stat label="PHA STATUS" value={selectedObject.pha ? 'Potentially hazardous' : 'Not classified'} alert={selectedObject.pha} /></div>
          <div className="next-approach"><div className="approach-icon"><CalendarDays size={17} /></div><div><span>NEXT CLOSE APPROACH</span><b>{selectedObject.next}</b></div><div className="approach-distance"><span>MISS DISTANCE</span><b>{selectedObject.nextDistance}</b></div></div>
          <button className="watch-object-button" onClick={() => { setWatch(true); setActiveTab('Close approach'); }}><Eye size={15} /> WATCH APPROACH <ArrowUpRight size={14} /></button>
        </>}
        {activeTab === 'Orbit' && <div className="orbit-tab">
          <div className="orbit-graphic"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><span className="orbit-sun" /><span className="orbit-dot earth-dot" /><span className="orbit-dot object-dot-orbit" style={{ background: selectedObject.color }} /><span className="orbit-legend">ORBITAL PATH · NOT TO SCALE</span></div>
          <div className="stat-grid"><Stat label="ORBIT CLASS" value={selectedObject.orbitClass} /><Stat label="SEMI-MAJOR AXIS" value={`${selectedObject.a.toFixed(3)} AU`} /><Stat label="ECCENTRICITY" value={selectedObject.e.toFixed(3)} /><Stat label="INCLINATION" value="3.3°" /></div>
          <p className="panel-footnote">Orbital elements shown are illustrative. Consult JPL Small-Body Database for current solutions.</p>
        </div>}
        {activeTab === 'Close approach' && <div className="approach-tab"><div className="approach-date-large"><CalendarDays size={18} /><span>MODELLED CLOSE APPROACH</span><b>{selectedObject.next}</b></div><div className="approach-geometry"><div className="geo-earth"><Globe2 size={20} /><span>EARTH</span></div><div className="geo-line"><span>{selectedObject.nextDistance}</span><i /></div><div className="geo-object" style={{ color: selectedObject.color }}><Sparkles size={19} /><span>{selectedObject.name.toUpperCase()}</span></div></div><div className="approach-facts"><p><b>Distance in perspective</b><span>{selectedObject.moid} minimum orbit intersection</span></p><p><b>What this means</b><span>A close approach is not an impact prediction. Most NEOs pass safely by Earth.</span></p></div><button className="watch-object-button" onClick={() => { setSimDate(new Date(Date.UTC(Number(selectedObject.next.slice(-4)) || 2029, 3, 13))); setPlaying(false); }}><Clock3 size={15} /> JUMP TO APPROACH DATE <ArrowUpRight size={14} /></button></div>}
        <div className="detail-source"><span>REFERENCE DATA · SIMPLIFIED ORBITS</span><button aria-label="Open source information" onClick={() => window.open('https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html', '_blank', 'noopener,noreferrer')}><ExternalLink size={12} /></button></div>
      </aside>}
      {!panelOpen && selectedObject && <button className="reopen-panel" onClick={() => setPanelOpen(true)}><ChevronLeft size={15} /> OBJECT DETAILS</button>}

      {showLearn && <div className="learn-overlay"><div className="learn-modal">
        <div className="learn-top"><span><Sparkles size={15} /> FIELD NOTES <span className="learn-count">0{storyIndex + 1} / 04</span></span><button className="icon-button" onClick={() => setShowLearn(false)} aria-label="Close learn panel"><X size={18} /></button></div>
        <div className="learn-content"><div className="learn-orbit-art"><div className="learn-planet" /><div className="learn-asteroid" /><span>EARTH’S ORBIT</span><span>NEO PATH</span></div><div className="learn-body"><p className="learn-kicker">{['THE BASICS', 'PERSPECTIVE', 'THE WATCHLIST', 'PLANETARY DEFENSE'][storyIndex]}</p><h2>{['Our cosmic neighborhood is closer than you think.', 'A close pass is not a near miss.', 'What makes an asteroid potentially hazardous?', 'A small nudge can change everything.'][storyIndex]}</h2><p>{[
          'Near-Earth objects are asteroids and comets whose orbits bring them within 1.3 astronomical units of the Sun. Most are ancient leftovers from the formation of our solar system.',
          'Space is vast. Even an object passing within a few lunar distances is still millions of kilometers away. Astronomers track these flybys carefully—and most are entirely routine.',
          'A PHA is a near-Earth object with an orbit that can approach within 0.05 AU of Earth and an absolute magnitude of 22 or brighter. The label describes geometry, not a forecast.',
          'In 2022, NASA’s DART spacecraft intentionally struck Dimorphos and changed its orbit around Didymos. It was the first full-scale demonstration of asteroid deflection technology.',
        ][storyIndex]}</p><div className="learn-controls"><button className="learn-back" disabled={storyIndex === 0} onClick={() => setStoryIndex(i => i - 1)}><ChevronLeft size={16} /> BACK</button><button className="learn-next" onClick={() => storyIndex === 3 ? setShowLearn(false) : setStoryIndex(i => i + 1)}>{storyIndex === 3 ? 'FINISH' : 'NEXT STORY'} <ChevronRight size={16} /></button></div><div className="learn-progress">{[0, 1, 2, 3].map(i => <i key={i} className={i <= storyIndex ? 'active' : ''} />)}</div></div></div>
      </div></div>}

      {showHelp && <div className="help-overlay" onClick={() => setShowHelp(false)}><section className="help-modal" onClick={e => e.stopPropagation()}><div className="help-heading"><div><p className="eyebrow">QUICK START</p><h2>Find your bearings.</h2></div><button className="icon-button" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={18} /></button></div><div className="help-row"><span>ROTATE VIEW</span><b>Click + drag</b></div><div className="help-row"><span>ZOOM IN / OUT</span><b>Scroll or pinch</b></div><div className="help-row"><span>SELECT AN OBJECT</span><b>Click a labeled body</b></div><div className="help-row"><span>PLAY / PAUSE TIME</span><kbd>SPACE</kbd></div><div className="help-row"><span>SEARCH OBJECTS</span><kbd>/</kbd></div><div className="help-row"><span>RETURN TO LIVE</span><kbd>L</kbd></div><p className="help-disclaimer">The visualization is an educational overview. Orbital positions are simplified and are not suitable for navigation or impact-risk assessment.</p></section></div>}

      <footer className="time-bar">
        <div className="time-head"><div className="time-control-group"><button className="play-button" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause simulation' : 'Play simulation'}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button className="date-display" onClick={() => { setSimDate(new Date()); setPlaying(false); }}><Clock3 size={15} /><span>{dateLabel(simDate)}</span><ChevronDown size={13} /></button><button className="live-button" onClick={() => { setSimDate(new Date()); setPlaying(false); }}><i /> LIVE</button></div><div className="speed-control"><Gauge size={14} /><span>SPEED</span>{speeds.map(s => <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}</div><button className="time-expand" onClick={() => setSimDate(new Date(simDate.getTime() + 365 * 86400000))} aria-label="Advance one year"><Plus size={14} /></button></div>
        <div className="timeline-wrap"><div className="timeline-labels"><span>2020</span><span>2023</span><span>2026</span><span>2029</span><span>2032</span><span>2035</span></div>        <div className="timeline-track"><div className="timeline-fill" style={{ width: `${rangeValue}%` }} /><div className="timeline-thumb" style={{ left: `${rangeValue}%` }} /><input type="range" min="0" max="100" step="0.05" value={rangeValue} onChange={e => setTimeFromRange(e.target.value)} aria-label="Simulation date from 2020 to 2035" /><div className="timeline-markers"><i title="DART impact — 2022" style={{ left: '16%' }} /><i title="Bennu sample return — 2023" style={{ left: '22%' }} /><i className="alert-marker" title="Apophis close approach — 2029" style={{ left: '60%' }} /><i title="Lucy Trojan flyby — 2033" style={{ left: '85%' }} /></div></div></div>
        <div className="time-foot"><span><span className="legend-dot cyan" /> ASTEROIDS <span className="legend-dot white" /> COMETS <span className="legend-dot orange" /> CLOSE APPROACH</span><span className="time-hint">DRAG TO EXPLORE TIME <span className="hint-divider">·</span> <kbd>SPACE</kbd> PLAY/PAUSE</span><span className="time-range"><ArrowDown size={12} /> 15 YEAR WINDOW <ArrowUp size={12} /></span></div>
      </footer>
      <div className="disclaimer"><Shield size={11} /> EDUCATIONAL VISUALIZATION · NOT FOR NAVIGATION</div>
      <div className="mobile-menu-toggle"><button onClick={() => setMobileCatalogOpen(p => !p)}><ListFilter size={17} /> Objects</button><button onClick={() => setWatch(v => !v)}><Crosshair size={17} /> Watch</button></div>
    </main>
  );
}

function ObjectRow({ item, active, onClick }: { item: SpaceObject; active: boolean; onClick: () => void }) {
  return <button className={`object-row ${active ? 'active' : ''}`} onClick={onClick}><span className={`row-dot ${item.kind === 'Comet' ? 'comet' : ''}`} style={{ background: item.color }} /><span className="row-main"><b>{item.name}</b><small>{item.id} <i>·</i> {item.orbitClass}</small></span>{item.pha && <span className="pha-badge">PHA</span>}{item.visited && <Telescope size={13} className="visited-icon" />}</button>;
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="stat"><span>{label}</span><b className={alert ? 'alert-text' : ''}>{value}</b></div>;
}

export default App;

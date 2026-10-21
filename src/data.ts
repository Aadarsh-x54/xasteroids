export type SpaceObject = {
  id: string;
  name: string;
  kind: 'Asteroid' | 'Comet';
  orbitClass: string;
  diameter: string;
  h: string;
  moid: string;
  pha: boolean;
  visited: boolean;
  a: number;
  e: number;
  phase: number;
  color: string;
  next: string;
  nextDistance: string;
};

export const objects: SpaceObject[] = [
  { id: '99942', name: 'Apophis', kind: 'Asteroid', orbitClass: 'Aten', diameter: '310–340 m', h: '19.7', moid: '0.0007 AU', pha: true, visited: false, a: 0.922, e: 0.191, phase: 2.2, color: '#ff785f', next: 'Apr 13, 2029', nextDistance: '31,600 km' },
  { id: '101955', name: 'Bennu', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '492 m', h: '20.9', moid: '0.0032 AU', pha: true, visited: true, a: 1.126, e: 0.204, phase: 4.15, color: '#f1aa67', next: 'Sep 25, 2135', nextDistance: '0.0038 AU' },
  { id: '162173', name: 'Ryugu', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '900 m', h: '19.2', moid: '0.0008 AU', pha: true, visited: true, a: 1.189, e: 0.191, phase: 5.08, color: '#74d9cf', next: 'Dec 06, 2076', nextDistance: '0.0046 AU' },
  { id: '65803', name: 'Didymos', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '780 m', h: '18.2', moid: '0.039 AU', pha: false, visited: true, a: 1.644, e: 0.384, phase: 3.2, color: '#80b9ff', next: 'Nov 04, 2123', nextDistance: '0.040 AU' },
  { id: '16', name: 'Psyche', kind: 'Asteroid', orbitClass: 'Main belt', diameter: '226 km', h: '5.9', moid: '1.05 AU', pha: false, visited: true, a: 2.923, e: 0.134, phase: 1.4, color: '#82aaff', next: '—', nextDistance: '—' },
  { id: '4', name: 'Vesta', kind: 'Asteroid', orbitClass: 'Main belt', diameter: '525 km', h: '3.2', moid: '1.14 AU', pha: false, visited: false, a: 2.362, e: 0.089, phase: 0.2, color: '#87aafa', next: '—', nextDistance: '—' },
  { id: '1', name: 'Ceres', kind: 'Asteroid', orbitClass: 'Main belt', diameter: '940 km', h: '3.4', moid: '1.59 AU', pha: false, visited: false, a: 2.767, e: 0.076, phase: 2.9, color: '#96b6ea', next: '—', nextDistance: '—' },
  { id: '3200', name: 'Phaethon', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '5.8 km', h: '14.3', moid: '0.019 AU', pha: true, visited: false, a: 1.271, e: 0.890, phase: 5.55, color: '#ff9371', next: 'Dec 07, 2028', nextDistance: '0.019 AU' },
  { id: '67P', name: 'Churyumov–Gerasimenko', kind: 'Comet', orbitClass: 'Jupiter-family', diameter: '4.3 km', h: '11.3', moid: '0.25 AU', pha: false, visited: true, a: 3.464, e: 0.641, phase: 4.8, color: '#e8f8ff', next: 'Nov 10, 2028', nextDistance: '0.42 AU' },
  { id: '103P', name: 'Hartley 2', kind: 'Comet', orbitClass: 'Jupiter-family', diameter: '1.6 km', h: '8.5', moid: '0.12 AU', pha: false, visited: true, a: 3.47, e: 0.695, phase: 0.9, color: '#f2fbff', next: 'Oct 26, 2027', nextDistance: '0.39 AU' },
  { id: '2024YR4', name: '2024 YR4', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '40–90 m', h: '23.9', moid: '0.005 AU', pha: true, visited: false, a: 2.52, e: 0.66, phase: 1.8, color: '#ff705e', next: 'Dec 22, 2032', nextDistance: '0.006 AU' },
  { id: '1999AN10', name: '1999 AN10', kind: 'Asteroid', orbitClass: 'Apollo', diameter: '800 m', h: '17.9', moid: '0.0026 AU', pha: true, visited: false, a: 1.46, e: 0.56, phase: 3.8, color: '#ff957b', next: 'Aug 07, 2027', nextDistance: '0.0026 AU' },
];

export const planets = [
  { name: 'Mercury', a: 0.39, size: 0.038, color: '#b7a99b' },
  { name: 'Venus', a: 0.72, size: 0.065, color: '#e9c999' },
  { name: 'Earth', a: 1, size: 0.07, color: '#45a9ff' },
  { name: 'Mars', a: 1.52, size: 0.052, color: '#ec8063' },
  { name: 'Jupiter', a: 3.3, size: 0.26, color: '#ddb78f' },
  { name: 'Saturn', a: 4.35, size: 0.22, color: '#e5d09e' },
  { name: 'Uranus', a: 5.45, size: 0.13, color: '#a3e4e9' },
  { name: 'Neptune', a: 6.35, size: 0.125, color: '#739bff' },
];

export const missions = [
  { name: 'DART', year: '2022', detail: 'First planetary defense test', object: 'Didymos' },
  { name: 'OSIRIS-REx', year: '2023', detail: 'Brought Bennu samples to Earth', object: 'Bennu' },
  { name: 'Hayabusa2', year: '2020', detail: 'Returned samples from Ryugu', object: 'Ryugu' },
  { name: 'Lucy', year: '2027', detail: 'First mission to Jupiter’s Trojans', object: 'Jupiter' },
  { name: 'Psyche', year: '2029', detail: 'Explore a metal-rich world', object: 'Psyche' },
];

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { objects, planets } from './data';

type Props = {
  selected: string | null;
  onSelect: (name: string) => void;
  playing: boolean;
  speed: number;
  date: Date;
  onReady: () => void;
};

const scale = 1.15;
function position(a: number, phase: number, date: Date, rate = 1) {
  const days = (date.getTime() - Date.UTC(2025, 0, 1)) / 86400000;
  const angle = phase + days * 0.0008 * rate / Math.max(0.15, a ** 1.5);
  const radius = a * scale;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

export default function Scene({ selected, onSelect, playing, speed, date, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const state = useRef({ date, playing, speed, selected, onSelect, onReady });
  state.current = { date, playing, speed, selected, onSelect, onReady };

  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b11');
    const camera = new THREE.PerspectiveCamera(48, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0.15, 10.4, 9.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.AmbientLight(0x9bb9e3, 1.15));
    const sunLight = new THREE.PointLight(0xffd5a0, 65, 0, 1.3);
    scene.add(sunLight);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), new THREE.MeshBasicMaterial({ color: '#ffd18c' }));
    scene.add(sun);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), new THREE.MeshBasicMaterial({ color: '#ffbd6c', transparent: true, opacity: 0.08 }));
    scene.add(glow);

    const starCount = 1700;
    const stars = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 22 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      stars[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      stars[i * 3 + 1] = r * Math.cos(phi);
      stars[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#9ebcdd', size: 0.035, transparent: true, opacity: 0.75, sizeAttenuation: true })));

    const orbitLine = (radius: number, color = '#344258') => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
      const points = curve.getPoints(240).map(p => new THREE.Vector3(p.x, 0, p.y));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.48 }));
      scene.add(line);
    };
    planets.forEach(p => orbitLine(p.a * scale, p.name === 'Earth' ? '#345775' : '#2b3648'));

    const planetMeshes = planets.map((p, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 20, 16), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.78, emissive: p.color, emissiveIntensity: i === 2 ? 0.13 : 0.035 }));
      mesh.userData = { name: p.name };
      scene.add(mesh);
      return { mesh, data: p, phase: i * 0.83 + 0.4 };
    });
    const objectMeshes = objects.map(o => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.name === 'Ceres' || o.name === 'Vesta' || o.name === 'Psyche' ? 0.043 : 0.031, 12, 10), new THREE.MeshBasicMaterial({ color: o.color }));
      mesh.userData = { name: o.name };
      scene.add(mesh);
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, o.a * scale, o.a * (1 - o.e) * scale, 0, Math.PI * 2).getPoints(200).map(p => new THREE.Vector3(p.x, 0.006, p.y))),
        new THREE.LineBasicMaterial({ color: o.color, transparent: true, opacity: 0.22 }),
      );
      ring.rotation.y = (parseFloat(o.id) || 7) * 0.018;
      scene.add(ring);
      return { mesh, data: o, ring };
    });
    const labelNodes = new Map(
      Array.from(labelLayer.current?.querySelectorAll<HTMLElement>('[data-scene-name]') ?? [])
        .map(node => [node.dataset.sceneName!, node]),
    );

    const count = 42000;
    const points = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    for (let i = 0; i < count; i++) {
      const a = rand(0.78, 3.35);
      const angle = rand(0, Math.PI * 2);
      const ecc = rand(0.01, 0.31);
      const radius = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(angle)) * scale;
      points[i * 3] = Math.cos(angle) * radius;
      points[i * 3 + 1] = rand(-0.09, 0.09);
      points[i * 3 + 2] = Math.sin(angle) * radius;
      const tint = Math.random();
      colors[i * 3] = tint < 0.08 ? 0.55 : 0.20;
      colors[i * 3 + 1] = tint < 0.08 ? 0.84 : 0.61;
      colors[i * 3 + 2] = tint < 0.08 ? 1 : 0.94;
    }
    const asteroidGeo = new THREE.BufferGeometry();
    asteroidGeo.setAttribute('position', new THREE.BufferAttribute(points, 3));
    asteroidGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Points(asteroidGeo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true })));

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 0.04;
    const pointer = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...objectMeshes.map(o => o.mesh), ...planetMeshes.map(p => p.mesh)]);
      if (hits[0]?.object.userData.name) state.current.onSelect(hits[0].object.userData.name);
    };
    renderer.domElement.addEventListener('click', onClick);
    let frame = 0;
    let ready = false;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const s = state.current;
      planetMeshes.forEach(({ mesh, data, phase }, i) => {
        mesh.position.copy(position(data.a, phase, s.date, i === 2 ? 1 : 0.2));
      });
      objectMeshes.forEach(({ mesh, data, ring }) => {
        const p = position(data.a, data.phase, s.date, 1 - data.e * 0.4);
        p.x *= 1 - data.e * 0.24;
        mesh.position.copy(p);
        ring.position.set(0, data.name === s.selected ? 0.018 : 0, 0);
        (ring.material as THREE.LineBasicMaterial).opacity = data.name === s.selected ? 0.68 : 0.18;
      });
      if (s.selected) {
        const target = [...objectMeshes, ...planetMeshes].find(item => item.data.name === s.selected)?.mesh.position;
        if (target && controls.target.distanceTo(target) > 3.8) controls.target.lerp(target, 0.018);
      } else controls.target.lerp(new THREE.Vector3(), 0.015);
      controls.update();
      renderer.render(scene, camera);
      const updateLabel = (name: string, mesh: THREE.Mesh) => {
        const label = labelNodes.get(name);
        if (!label) return;
        const projected = mesh.position.clone().project(camera);
        const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
        label.style.display = visible ? 'block' : 'none';
        if (visible) {
          label.style.left = `${(projected.x * 0.5 + 0.5) * el.clientWidth}px`;
          label.style.top = `${(-projected.y * 0.5 + 0.5) * el.clientHeight}px`;
        }
      };
      planetMeshes.forEach(({ mesh, data }) => updateLabel(data.name, mesh));
      objectMeshes.forEach(({ mesh, data }) => updateLabel(data.name, mesh));
      if (!ready) {
        ready = true;
        s.onReady();
      }
    };
    frame = requestAnimationFrame(animate);
    const resize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      scene.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
          child.geometry.dispose();
          const material = child.material;
          if (Array.isArray(material)) material.forEach(m => m.dispose());
          else material.dispose();
        }
      });
    };
  }, []);

  return <div className="scene-wrapper">
    <div className="scene-host" ref={host} aria-label="Interactive 3D solar system. Drag to orbit, scroll to zoom, click a labeled object to explore." />
    <div className="scene-label-layer" ref={labelLayer} aria-hidden="true">
      {planets.map(planet => <span key={planet.name} className="scene-label" data-scene-name={planet.name}><i />{planet.name.toUpperCase()}</span>)}
      {objects.filter(o => ['Apophis', 'Bennu', 'Ryugu', 'Didymos', 'Psyche', 'Vesta', 'Ceres'].includes(o.name))
        .map(object => <span key={object.name} className="scene-label body-label" data-scene-name={object.name} style={{ color: object.color }}><i />{object.name.toUpperCase()}</span>)}
    </div>
  </div>;
}

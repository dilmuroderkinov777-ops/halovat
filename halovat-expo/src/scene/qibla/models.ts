import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The build embeds these local assets. A scene never depends on a CDN or an API.
declare const __QIBLA_TEXTURES__: Record<'personRear' | 'kiswa' | 'door', string>;
export function loadSceneTextures() {
  const loader = new T.TextureLoader();
  const pending: Promise<void>[] = [];
  const load = (name: keyof typeof __QIBLA_TEXTURES__) => {
    let texture!: T.Texture;
    pending.push(new Promise<void>((resolve, reject) => {
      texture = loader.load(__QIBLA_TEXTURES__[name], () => resolve(), undefined, () => reject(new Error(`Could not load ${name} texture`)));
    }));
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  };
  const person = load('personRear'), kiswa = load('kiswa'), door = load('door');
  return { person, kiswa, door, ready: Promise.all(pending) };
}

function mesh(parent: T.Group, geometry: T.BufferGeometry, material: T.Material | T.Material[], x: number, y: number, z: number) {
  const part = new T.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

function stoneBox(parent: T.Group, size: [number, number, number], material: T.Material, at: [number, number, number], radius = 0.012) {
  return mesh(parent, new RoundedBoxGeometry(...size, 1, radius), material, ...at);
}

/** Straight rear view: the person's shoulders, phone and feet all face world -Z. */
export function createPerson(texture: T.Texture) {
  const person = new T.Group();
  person.name = 'person-fixed';
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.1, depthWrite: true, depthTest: true, toneMapped: false }));
  sprite.name = 'phone-in-hands';
  sprite.center.set(0.5, 0.035);
  sprite.scale.set(2.0, 3.0, 1);
  sprite.position.y = 0.04;
  person.add(sprite);
  return person;
}

/** A small baked contact shadow complements the real directional shadows. */
export function createContactShadow(width: number, depth: number, opacity = 0.25) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const gradient = c.createRadialGradient(64, 64, 8, 64, 64, 62);
  gradient.addColorStop(0, `rgba(42,41,29,${opacity})`);
  gradient.addColorStop(0.48, `rgba(42,41,29,${opacity * 0.55})`);
  gradient.addColorStop(1, 'rgba(42,41,29,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const shadow = new T.Mesh(new T.PlaneGeometry(width, depth), new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.008;
  return shadow;
}

/** Ivory slabs, soft veins, hairline grout. Texture is deterministic and local. */
export function createMarbleTexture(dark: boolean, repeat = 1) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  let seed = 42017;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  c.fillStyle = dark ? '#1d3027' : '#f6f2e9'; c.fillRect(0, 0, 1024, 1024);
  const tile = 256;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    c.save(); c.beginPath(); c.rect(x * tile + 1, y * tile + 1, tile - 2, tile - 2); c.clip();
    const gradient = c.createLinearGradient(x * tile, y * tile, (x + 1) * tile, (y + 1) * tile);
    const lightness = 0.08 + random() * 0.16;
    gradient.addColorStop(0, `rgba(255,255,255,${dark ? 0.012 : lightness})`);
    gradient.addColorStop(0.6, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, `rgba(139,126,99,${dark ? 0.015 : 0.045 + random() * 0.025})`);
    c.fillStyle = gradient; c.fillRect(x * tile, y * tile, tile, tile);
    for (let vein = 0; vein < 9; vein++) {
      let vx = x * tile + random() * 280 - 12;
      c.beginPath(); c.moveTo(vx, y * tile);
      for (let step = 1; step <= 12; step++) {
        const next = vx + (random() - 0.4) * 60;
        c.quadraticCurveTo(vx + (random() - 0.5) * 30, y * tile + (step - 0.5) * tile / 12, next, y * tile + step * tile / 12);
        vx = next;
      }
      c.lineWidth = 0.3 + random() * 2;
      c.strokeStyle = `rgba(122,131,128,${dark ? 0.02 : 0.035})`; c.stroke();
    }
    c.restore();
  }
  c.strokeStyle = dark ? '#35483d' : '#c7b89e'; c.lineWidth = 1.6;
  for (let i = 0; i <= 4; i++) {
    c.beginPath(); c.moveTo(i * tile, 0); c.lineTo(i * tile, 1024); c.stroke();
    c.beginPath(); c.moveTo(0, i * tile); c.lineTo(1024, i * tile); c.stroke();
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 4;
  return texture;
}

export function createKaaba(textures: ReturnType<typeof loadSceneTextures>) {
  const kaaba = new T.Group(); kaaba.name = 'kaaba';
  const cloth = new T.MeshStandardMaterial({ map: textures.kiswa, bumpMap: textures.kiswa, bumpScale: 0.012, roughness: 0.82, toneMapped: false });
  const front = new T.MeshStandardMaterial({ map: textures.door, bumpMap: textures.door, bumpScale: 0.014, roughness: 0.84, metalness: 0, toneMapped: false });
  const roof = new T.MeshStandardMaterial({ color: '#ded4bc', map: createMarbleTexture(false), roughness: 0.7 });
  const rim = new T.MeshStandardMaterial({ color: '#181b19', roughness: 0.86 });
  const edge = new T.MeshStandardMaterial({ color: '#b9ad94', roughness: 0.82 });
  const stone = new T.MeshStandardMaterial({ color: '#e0d7c3', roughness: 0.72 });
  const grout = new T.MeshStandardMaterial({ color: '#b2a58d', roughness: 1 });
  const width = 2.04, depth = 1.94, height = 2.04, base = 0.16;
  stoneBox(kaaba, [width + 0.15, base, depth + 0.15], grout, [0, base / 2, 0]);
  // Individual limestone plinth blocks stay crisp along the bottom of the cloth.
  for (let i = 0; i < 8; i++) {
    for (const z of [-1, 1]) stoneBox(kaaba, [(width + 0.15) / 8 - 0.007, 0.145, 0.07], stone,
      [-(width + 0.15) / 2 + (i + 0.5) * (width + 0.15) / 8, 0.085, z * (depth + 0.1) / 2], 0.004);
    for (const x of [-1, 1]) stoneBox(kaaba, [0.07, 0.145, (depth + 0.04) / 8 - 0.007], stone,
      [x * (width + 0.1) / 2, 0.085, -(depth + 0.04) / 2 + (i + 0.5) * (depth + 0.04) / 8], 0.004);
  }
  mesh(kaaba, new T.BoxGeometry(width, height, depth), [cloth, cloth, roof, rim, front, cloth], 0, base + height / 2, 0);
  // Recessed pale roof and black parapet reproduce the reference silhouette.
  const top = base + height;
  for (const x of [-1, 1]) {
    stoneBox(kaaba, [0.07, 0.14, depth + 0.03], rim, [x * (width / 2 - 0.02), top + 0.055, 0], 0.007);
    mesh(kaaba, new T.BoxGeometry(0.017, 0.10, depth - 0.08), edge, x * (width / 2 - 0.065), top + 0.04, 0);
  }
  for (const z of [-1, 1]) {
    stoneBox(kaaba, [width - 0.08, 0.14, 0.07], rim, [0, top + 0.055, z * (depth / 2 - 0.02)], 0.007);
    mesh(kaaba, new T.BoxGeometry(width - 0.13, 0.10, 0.017), edge, 0, top + 0.04, z * (depth / 2 - 0.065));
  }
  mesh(kaaba, new T.BoxGeometry(0.09, 0.055, 0.24), new T.MeshStandardMaterial({ color: '#bba25b', metalness: 0.65, roughness: 0.4 }), 0, top + 0.035, -depth / 2 - 0.08);
  mergeStaticParts(kaaba);
  kaaba.add(createContactShadow(3.6, 3.2, 0.36));
  return kaaba;
}

/** Batch static geometry by material; preserve the Kaaba's six texture groups. */
function mergeStaticParts(group: T.Group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  const originals = new Set<T.BufferGeometry>();
  const separate: T.Mesh[] = [];
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    if (Array.isArray(object.material)) { separate.push(object); return; }
    let geometry = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    if (geometry.index) { const expanded = geometry.toNonIndexed(); geometry.dispose(); geometry = expanded; }
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
    const batch = batches.get(object.material) ?? [];
    batch.push(geometry); batches.set(object.material, batch); originals.add(object.geometry);
  });
  group.clear(); separate.forEach(part => group.add(part));
  batches.forEach((parts, material) => {
    const geometry = mergeGeometries(parts, false);
    if (!geometry) throw new Error('Could not merge Qibla model parts');
    mesh(group, geometry, material, 0, 0, 0); parts.forEach(part => part.dispose());
  });
  originals.forEach(geometry => geometry.dispose());
}

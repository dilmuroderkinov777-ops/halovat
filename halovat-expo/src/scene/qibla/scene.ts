import * as T from 'three';
import { createFloorReflection } from './reflection';
import { headingDelta } from '../../domain/compassHeading';
import { radians } from '../../domain/qibla';
import { createContactShadow, createKaaba, createMarbleTexture, createPerson, createSurroundings, loadSceneTextures } from './models';

export type QiblaSceneState = {
  heading: number | null; bearing: number; aligned: boolean; active: boolean; dark: boolean; reduceMotion: boolean;
};
const RADIUS = 8.6;

/** Camera and person are fixed. Geographic objects rotate about the person's feet. */
export function createQiblaScene(canvas: HTMLCanvasElement, onError: (message: string) => void) {
  const scene = new T.Scene();
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.VSMShadowMap;
  const camera = new T.OrthographicCamera(-4.5, 4.5, 4.5, -4.5, 0.1, 65);
  camera.position.set(1.163, 11.471, 8.973);
  camera.lookAt(3.443, 0, -7.250);
  const sky = new T.HemisphereLight('#ffffff', '#b6b3a6', 1.8);
  scene.add(sky);
  const sun = new T.DirectionalLight('#fff2db', 2.1);
  sun.position.set(-4, 10, -3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 30 });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0003;
  sun.shadow.radius = 4;
  sun.shadow.blurSamples = 8;
  scene.add(sun);
  const world = new T.Group(); world.name = 'rotating-world'; scene.add(world);
  const groundMaterial = new T.MeshStandardMaterial({ map: createMarbleTexture(false, 5), roughness: 0.58, metalness: 0.05 });
  const ground = new T.Mesh(new T.PlaneGeometry(40, 40), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.rotation.z = Math.PI / 4; ground.position.y = -0.012; ground.receiveShadow = true;
  world.add(ground);
  const textures = loadSceneTextures();
  let surroundings = createSurroundings(false, textures.planter); world.add(surroundings);
  const target = new T.Group(); target.name = 'qibla-target'; target.visible = false;
  const kaaba = createKaaba(textures); kaaba.rotation.y = -0.18; kaaba.scale.setScalar(1.45); target.add(kaaba); world.add(target);
  const lineMaterial = new T.MeshBasicMaterial({ color: '#79cea1', transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const line = new T.Mesh(new T.BufferGeometry(), lineMaterial); world.add(line); line.visible = false;

  const person = createPerson(textures.person); scene.add(person);
  const personShadow = createContactShadow(2.3, 1.8, 0.20); personShadow.position.z = 0.3; scene.add(personShadow);
  const haloMaterial = new T.MeshBasicMaterial({ color: '#65ce9c', transparent: true, opacity: 0.22, depthWrite: false });
  const halo = new T.Mesh(new T.CircleGeometry(1.0, 64), haloMaterial);
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.018; scene.add(halo);
  const inner = new T.Mesh(new T.CircleGeometry(0.70, 64), new T.MeshBasicMaterial({ color: '#087859', transparent: true, opacity: 0.80, depthWrite: false, toneMapped: false }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.022; scene.add(inner);
  const arrowShape = new T.Shape();
  arrowShape.moveTo(0, 0.22); arrowShape.lineTo(-0.12, -0.10); arrowShape.lineTo(0, -0.025); arrowShape.lineTo(0.12, -0.10); arrowShape.closePath();
  const arrow = new T.Mesh(new T.ExtrudeGeometry(arrowShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.007, bevelSegments: 1, steps: 1 }), new T.MeshStandardMaterial({ color: '#087357', roughness: 0.6 }));
  arrow.rotation.x = -Math.PI / 2; arrow.position.set(0.82, 0.035, -0.75); scene.add(arrow);

  const reflection = createFloorReflection([ground, person, halo, inner, line, arrow]); scene.add(reflection);

  let state: QiblaSceneState = { heading: null, bearing: 0, aligned: false, active: false, dark: false, reduceMotion: false };
  let currentHeading: number | null = null;
  let targetHeading = 0;
  let disposed = false;
  let frame = 0;
  let lastFrame = 0;
  let draws = 0;
  let contextLost = false;
  let readyFrames = 0;
  let lastBearing: number | null = null;
  let texturesReady = false;
  const ready = textures.ready.then(() => { texturesReady = true; if (disposed) { textures.person.dispose(); textures.kiswa.dispose(); textures.door.dispose(); textures.planter.dispose(); } else invalidate(); });

  const setTheme = (dark: boolean) => {
    const color = dark ? '#0e1914' : '#faf9f5';
    scene.background = new T.Color(color);
    renderer.toneMappingExposure = dark ? 1.0 : 2.0;
    document.body.style.setProperty('--canvas', color);
    scene.fog = new T.Fog(color, 18, 32);
    groundMaterial.map?.dispose(); groundMaterial.map = createMarbleTexture(dark, 5); groundMaterial.needsUpdate = true;
    (reflection.material as T.ShaderMaterial).uniforms.strength.value = dark ? 0.04 : 0.09;
    person.traverse(object => { if (object instanceof T.Sprite) object.material.color.set(dark ? '#c1d1c6' : '#ffffff'); });
    sky.intensity = dark ? 1.1 : 1.8;
    sun.intensity = dark ? 1.0 : 2.1;
    world.remove(surroundings); disposeGroup(surroundings, new Set([textures.planter]));
    surroundings = createSurroundings(dark, textures.planter); world.add(surroundings);
  };
  setTheme(false);

  function render(time: number) {
    frame = 0;
    if (disposed || !state.active || contextLost) return;
    if (lastFrame && time - lastFrame < 1000 / 30) { frame = requestAnimationFrame(render); return; }
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, 0.12) : 0.033;
    lastFrame = time;
    const remaining = targetHeading - (currentHeading ?? targetHeading);
    currentHeading = state.reduceMotion || Math.abs(remaining) < 0.05 ? targetHeading : (currentHeading ?? targetHeading) + remaining * (1 - Math.exp(-dt * 16));
    // In Three's Y-up coordinates +heading turns the geographic world left.
    // Target x after rotation is R*sin(bearing - heading), so zero is straight ahead.
    if (Math.abs(targetHeading - currentHeading) < 0.05) currentHeading = targetHeading;
    world.rotation.y = radians(currentHeading);
    try { renderer.info.reset(); renderer.render(scene, camera); draws++; readyFrames++; }
    catch (error) { onError(String(error)); return; }
    if (Math.abs(targetHeading - currentHeading) >= 0.05) frame = requestAnimationFrame(render);
  }

  function invalidate() {
    if (!disposed && state.active && !frame && !contextLost) frame = requestAnimationFrame(render);
  }
  function resize() {
    const width = Math.max(canvas.clientWidth, 1), height = Math.max(canvas.clientHeight, 1);
    renderer.setSize(width, height, false);
    const viewHeight = Math.max(11.8, 12.0 / (width / height));
    camera.left = -viewHeight * width / height / 2; camera.right = -camera.left;
    camera.top = viewHeight / 2; camera.bottom = -camera.top; camera.updateProjectionMatrix();
    invalidate();
  }
  function update(next: QiblaSceneState) {
    if (disposed || !Number.isFinite(next.bearing)) return;
    const wasReady = state.heading !== null;
    if (next.dark !== state.dark) setTheme(next.dark);
    state = { ...next, heading: next.heading !== null && Number.isFinite(next.heading) ? next.heading : null };
    target.visible = line.visible = state.heading !== null;
    if (state.heading !== null) {
      if (currentHeading === null || !wasReady) currentHeading = targetHeading = state.heading;
      else targetHeading += headingDelta(targetHeading, state.heading);
    }
    const b = radians(state.bearing);
    target.position.set(Math.sin(b) * RADIUS, 0, -Math.cos(b) * RADIUS);
    target.rotation.y = -b - 0.08;
    if (lastBearing !== state.bearing) {
      line.geometry.dispose();
      const points: number[] = [], dx = Math.sin(b), dz = -Math.cos(b);
      for (let distance = 0.9; distance < RADIUS - 1.4; distance += 0.28) {
        const end = Math.min(distance + 0.16, RADIUS - 1.4), half = 0.024;
        const a = [dx * distance + dz * half, 0.028, dz * distance - dx * half];
        const b = [dx * distance - dz * half, 0.028, dz * distance + dx * half];
        const c = [dx * end - dz * half, 0.028, dz * end + dx * half];
        const d = [dx * end + dz * half, 0.028, dz * end - dx * half];
        points.push(...a, ...c, ...b, ...a, ...d, ...c);
      }
      line.geometry = new T.BufferGeometry(); line.geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
      lastBearing = state.bearing;
    }
    haloMaterial.opacity = state.aligned ? 0.46 : 0.22;
    lineMaterial.opacity = state.aligned ? 1 : 0.80;
    if (!state.active) { cancelAnimationFrame(frame); frame = 0; lastFrame = 0; }
    else invalidate();
  }
  const lost = (event: Event) => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; onError('WebGL context lost'); };
  canvas.addEventListener('webglcontextlost', lost);
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();

  return {
    update, ready,
    inspect() {
      scene.updateMatrixWorld(true);
      const targetPoint = target.getWorldPosition(new T.Vector3());
      const personPoint = person.getWorldPosition(new T.Vector3());
      const project = (point: T.Vector3) => point.clone().project(camera).toArray();
      // Include the complete roof/plinth, not only the target's center, in framing checks.
      const kaabaBounds: number[][] = [];
      kaaba.traverse(part => {
        if (!(part instanceof T.Mesh) || !part.castShadow) return;
        part.geometry.computeBoundingBox();
        const bounds = part.geometry.boundingBox!;
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
          kaabaBounds.push(project(new T.Vector3(x, y, z).applyMatrix4(part.matrixWorld)));
        }
      });
      return { draws, readyFrames, texturesReady, active: state.active, scheduled: Boolean(frame), heading: currentHeading, targetHeading,
        personPosition: personPoint.toArray(), personRotation: person.rotation.toArray(), cameraPosition: camera.position.toArray(),
        kaabaPosition: targetPoint.toArray(), targetVisible: target.visible, kaabaScreen: project(targetPoint),
        personScreen: project(personPoint), forwardScreen: project(new T.Vector3(0, 0, -1)), kaabaBounds, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, pixelRatio: renderer.getPixelRatio() };
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); frame = 0;
      observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
      reflection.dispose(); disposeGroup(scene); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

function disposeGroup(group: T.Object3D, keep = new Set<T.Texture>()) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  group.traverse(object => {
    if (object instanceof T.Mesh || object instanceof T.Line || object instanceof T.Sprite) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value instanceof T.Texture) textures.add(value); });
      });
    }
  });
  textures.forEach(value => { if (!keep.has(value)) value.dispose(); }); geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
}

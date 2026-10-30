import * as T from 'three';

/** Real, depth-tested palms, planted directly in the floor. Two instanced draw calls. */
export function createSurroundings(dark: boolean) {
  const group = new T.Group(); group.name = 'map-surroundings';
  const positions: number[] = [], colors: number[] = [];
  const leaf = new T.Color();
  const triangle = (a: T.Vector3, b: T.Vector3, c: T.Vector3, shade: number) => {
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    leaf.set(dark ? '#284831' : '#375e32').multiplyScalar(0.5 + shade * 0.42);
    for (let i = 0; i < 3; i++) colors.push(leaf.r, leaf.g, leaf.b);
  };
  for (let frond = 0; frond < 10; frond++) {
    const angle = frond * Math.PI * 2 / 10 + (frond % 2) * 0.15;
    const radial = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new T.Vector3(-radial.z, 0, radial.x);
    const length = frond % 2 ? 1.6 : 1.9;
    const point = (t: number) => radial.clone().multiplyScalar(t * length)
      .add(new T.Vector3(0.08, 2.65 + Math.sin(t * Math.PI) * 0.38 - t * t * (frond % 2 ? 0.32 : 0.8), 0));
    for (let segment = 0; segment < 12; segment++) {
      const t = segment / 12, next = (segment + 1) / 12;
      const a = point(t), b = point(next), width = 0.016 * (1 - t) + 0.003;
      triangle(a.clone().addScaledVector(side, width), a.clone().addScaledVector(side, -width), b, 0.8);
      if (segment === 0) continue;
      for (const sign of [-1, 1]) {
        const reach = Math.sin(Math.PI * t) * 0.48;
        const tip = a.clone().addScaledVector(side, sign * reach).addScaledVector(radial, 0.30 * (1 - t));
        tip.y -= 0.13 + t * 0.12;
        const shoulder = a.clone().lerp(tip, 0.40).addScaledVector(radial, 0.07);
        triangle(a, shoulder, tip, 0.35 + (frond % 3) * 0.2);
        triangle(a, tip, a.clone().lerp(tip, 0.5).addScaledVector(radial, -0.025), 0.12);
      }
    }
  }
  const canopyGeometry = new T.BufferGeometry();
  canopyGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  canopyGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  canopyGeometry.computeVertexNormals();
  const trunkGeometry = new T.CylinderGeometry(0.07, 0.14, 2.65, 7, 8);
  const trunkPositions = trunkGeometry.getAttribute('position');
  for (let i = 0; i < trunkPositions.count; i++) {
    const y = trunkPositions.getY(i) + 1.325;
    trunkPositions.setXYZ(i, trunkPositions.getX(i) + 0.08 * (y / 2.65) ** 2, y, trunkPositions.getZ(i));
  }
  trunkGeometry.computeVertexNormals();
  const locations = Array.from({ length: 24 }, (_, i) => {
    // Keep the entire target orbit and the center clear at every compass heading.
    const ring = i < 14 ? 11.4 : 17.5, count = i < 14 ? 14 : 10;
    const angle = (i < 14 ? i : i - 14) * Math.PI * 2 / count + 0.17;
    return { x: Math.sin(angle) * ring, z: -Math.cos(angle) * ring, scale: 0.88 + (i % 4) * 0.09, angle };
  });
  const trunks = new T.InstancedMesh(trunkGeometry, new T.MeshStandardMaterial({ color: dark ? '#4a4030' : '#9c8060', roughness: 0.95 }), locations.length);
  const canopies = new T.InstancedMesh(canopyGeometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: T.DoubleSide }), locations.length);
  trunks.name = 'palm-trunks'; canopies.name = 'palm-fronds';
  const transform = new T.Object3D();
  locations.forEach(({ x, z, scale, angle }, i) => {
    transform.position.set(x, 0, z); transform.rotation.y = angle; transform.scale.setScalar(scale); transform.updateMatrix();
    trunks.setMatrixAt(i, transform.matrix); canopies.setMatrixAt(i, transform.matrix);
  });
  trunks.castShadow = canopies.castShadow = true;
  trunks.receiveShadow = canopies.receiveShadow = true;
  group.add(trunks, canopies);
  return group;
}

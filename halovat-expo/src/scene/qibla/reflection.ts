import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/** A low-resolution, softly filtered reflection gives the marble its restrained sheen. */
export function createFloorReflection(hiddenInReflection: T.Object3D[]) {
  // Three exposes this shader at runtime; its public class typings omit the static field.
  const shader = (Reflector as typeof Reflector & { ReflectorShader: {
    uniforms: Record<string, T.IUniform>; vertexShader: string; fragmentShader: string;
  } }).ReflectorShader;
  const floor = new Reflector(new T.PlaneGeometry(60, 60), {
    color: '#808080', textureWidth: 256, textureHeight: 256, multisample: 0, clipBias: 0.003,
    shader: {
      ...shader,
      uniforms: { ...shader.uniforms, strength: { value: 0.13 } },
      fragmentShader: shader.fragmentShader
        .replace('uniform vec3 color;', 'uniform vec3 color; uniform float strength;')
        .replace('vec4 base = texture2DProj( tDiffuse, vUv );', `
          vec2 uv = vUv.xy / vUv.w;
          vec4 base = texture2D(tDiffuse, uv) * 0.36;
          base += texture2D(tDiffuse, uv + vec2(0.004, 0.0)) * 0.16;
          base += texture2D(tDiffuse, uv - vec2(0.004, 0.0)) * 0.16;
          base += texture2D(tDiffuse, uv + vec2(0.0, 0.004)) * 0.16;
          base += texture2D(tDiffuse, uv - vec2(0.0, 0.004)) * 0.16;
        `)
        .replace('blendOverlay( base.rgb, color ), 1.0', 'blendOverlay( base.rgb, color ), strength'),
    },
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.007;
  const material = floor.material as T.ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  floor.renderOrder = -1;
  const reflect = floor.onBeforeRender;
  floor.onBeforeRender = function (...args) {
    const visible = hiddenInReflection.map(object => object.visible);
    hiddenInReflection.forEach(object => { object.visible = false; });
    try { reflect.apply(this, args); }
    finally { hiddenInReflection.forEach((object, i) => { object.visible = visible[i]; }); }
  };
  return floor;
}

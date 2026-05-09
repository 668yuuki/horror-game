// ポストプロセス: ビネット + フィルムグレイン + 色収差 (Bloom は軽量化のため削除)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass }     from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js';
import { QUALITY }        from '../config.js';

const HorrorShader = {
  uniforms: {
    tDiffuse:     { value: null },
    uTime:        { value: 0 },
    uVignette:    { value: 0.85 },
    uGrain:       { value: 0.08 },
    uChroma:      { value: 0.0025 },
    uDamage:      { value: 0.0 }, // 0..1
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uChroma;
    uniform float uDamage;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 78.233);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      // 軽いバレル歪み
      float r2 = dot(c, c);
      uv = 0.5 + c * (1.0 + 0.08 * r2);

      // クロマアバベ（赤チャンネルだけずらす）
      float ch = uChroma + uDamage * 0.01;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ch).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ch).b;

      // ビネット
      float vig = smoothstep(1.0, 0.25, length(c) * uVignette);
      col *= vig;

      // フィルムグレイン
      float n = hash(uv * vec2(1920.0, 1080.0) + uTime * 60.0);
      col += (n - 0.5) * uGrain;

      // ダメージ赤フラッシュ
      col = mix(col, vec3(0.6, 0.05, 0.05), uDamage * smoothstep(0.3, 1.0, length(c)));

      // 軽いトーン
      col = pow(col, vec3(0.95));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.lite = !QUALITY.postFX;
    this.damage = 0;

    if (this.lite) return;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);
    this.composer.addPass(new RenderPass(scene, camera));

    this.horror = new ShaderPass(HorrorShader);
    this.composer.addPass(this.horror);

    this.composer.addPass(new OutputPass());
  }

  setSize(w, h) {
    if (this.lite) return;
    this.composer.setSize(w, h);
  }

  pulseDamage() { this.damage = 1.0; }

  render(dt, time) {
    if (this.lite) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.horror.uniforms.uTime.value = time;
    this.damage = Math.max(0, this.damage - dt * 1.8);
    this.horror.uniforms.uDamage.value = this.damage;
    this.composer.render();
  }
}

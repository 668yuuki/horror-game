// 武器3種: 懐中電灯 / 塩 / 数珠
import * as THREE from 'three';
import { CONFIG, QUALITY } from '../config.js';

export class WeaponSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {import('./Ghost.js').Ghost} ghostRef
   * @param {import('./Collision.js').CollisionWorld} collision
   */
  constructor(scene, camera, ghostRef, collision) {
    this.scene = scene;
    this.camera = camera;
    this.ghost = ghostRef;
    this.collision = collision;

    this.current = 0; // 0=flashlight, 1=salt, 2=juzu
    this.salt = CONFIG.weapons.salt.initial;
    this.battery = CONFIG.weapons.flashlight.batteryMax;
    this.juzuCooldown = 0;

    // 懐中電灯（カメラに付ける SpotLight）
    this.flashlight = new THREE.SpotLight(0xfff2cc, 22, 32, Math.PI * 0.26, 0.5, 1.4);
    this.flashlight.castShadow = QUALITY.flashlightShadow;
    if (QUALITY.flashlightShadow) {
      this.flashlight.shadow.mapSize.set(512, 512);
      this.flashlight.shadow.camera.near = 0.2;
      this.flashlight.shadow.camera.far = 32;
      this.flashlight.shadow.bias = -0.001;
    }
    this.flashlight.position.set(0, 0, 0);
    this.flashTarget = new THREE.Object3D();
    camera.add(this.flashlight);
    camera.add(this.flashTarget);
    this.flashTarget.position.set(0, 0, -1);
    this.flashlight.target = this.flashTarget;
    this.flashlightOn = true;

    // 飛んでいる塩
    this.saltProjectiles = []; // {mesh, vel, ttl}

    // 毎フレーム使う tmp ベクトル (GC 対策)
    this._tmpCamPos = new THREE.Vector3();
    this._tmpCamDir = new THREE.Vector3();
    this._tmpToGhost = new THREE.Vector3();
  }

  setCurrent(idx) {
    this.current = idx;
  }

  // 懐中電灯のON/OFF切替（バッテリーが0なら強制OFF）
  _updateFlashlight(dt) {
    if (this.battery <= 0) {
      this.flashlightOn = false;
    }
    // 懐中電灯選択中のみ ON、他選択時は OFF
    const want = this.current === 0 && this.battery > 0;
    this.flashlightOn = want;
    this.flashlight.intensity = want ? 22 : 0;
    if (want) {
      this.battery = Math.max(0, this.battery - CONFIG.weapons.flashlight.batteryDrain * dt);
      // ビームに入っているか判定
      const ghost = this.ghost;
      if (ghost && ghost.alive && !ghost.isSealed()) {
        const camPos = this._tmpCamPos; this.camera.getWorldPosition(camPos);
        const camDir = this._tmpCamDir; this.camera.getWorldDirection(camDir);
        const toGhost = this._tmpToGhost.copy(ghost.position).sub(camPos);
        const dist = toGhost.length();
        if (dist < 14) {
          const cos = toGhost.x / dist * camDir.x + toGhost.y / dist * camDir.y + toGhost.z / dist * camDir.z;
          if (cos > Math.cos(Math.PI * 0.18) &&
              !this.collision.isLineBlocked(camPos, ghost.position)) {
            ghost.stun(0.2); // 当てている間ずっと stun を付与
          }
        }
      }
    }
  }

  // 左クリック発射
  fire() {
    if (this.current === 1) {
      // 塩を投げる
      if (this.salt <= 0) return;
      this.salt -= 1;
      const camPos = new THREE.Vector3(); this.camera.getWorldPosition(camPos);
      const camDir = new THREE.Vector3(); this.camera.getWorldDirection(camDir);
      const geo = new THREE.SphereGeometry(0.1, 8, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x888888 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(camPos).addScaledVector(camDir, 0.6);
      this.scene.add(mesh);
      this.saltProjectiles.push({
        mesh,
        vel: camDir.clone().multiplyScalar(CONFIG.weapons.salt.throwSpeed),
        ttl: 2.0,
      });
    } else if (this.current === 2) {
      // 数珠で押し返し
      if (this.juzuCooldown > 0) return;
      this.juzuCooldown = CONFIG.weapons.juzu.cooldown;
      const ghost = this.ghost;
      if (!ghost || !ghost.alive || ghost.isSealed()) return;
      const camPos = new THREE.Vector3(); this.camera.getWorldPosition(camPos);
      const camDir = new THREE.Vector3(); this.camera.getWorldDirection(camDir);
      const toG = ghost.position.clone().sub(camPos);
      const dist = toG.length();
      if (dist < CONFIG.weapons.juzu.range) {
        const cos = toG.normalize().dot(camDir);
        if (cos > 0.4) {
          ghost.pushBack(toG, CONFIG.weapons.juzu.pushBack);
          ghost.stun(0.6);
        }
      }
    }
  }

  update(dt) {
    this._updateFlashlight(dt);
    if (this.juzuCooldown > 0) this.juzuCooldown -= dt;

    // 塩の弾を進める
    for (let i = this.saltProjectiles.length - 1; i >= 0; i--) {
      const p = this.saltProjectiles[i];
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt;
      p.ttl -= dt;

      // ヒット判定
      let hit = false;
      const ghost = this.ghost;
      if (ghost && ghost.alive && !ghost.isSealed()) {
        if (p.mesh.position.distanceTo(ghost.position) < 0.9) {
          ghost.stun(CONFIG.weapons.salt.stunOnHit);
          hit = true;
        }
      }
      if (this.collision.pointInsideAny(p.mesh.position) || p.mesh.position.y < 0 || p.ttl <= 0 || hit) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.saltProjectiles.splice(i, 1);
      }
    }
  }

  addSalt(n) { this.salt += n; }
  addBattery(n) {
    this.battery = Math.min(CONFIG.weapons.flashlight.batteryMax, this.battery + n);
  }

  status() {
    const labels = ['[1] 懐中電灯', '[2] 塩', '[3] 数珠'];
    const sub = [
      '',
      `× ${this.salt}`,
      this.juzuCooldown > 0 ? `CD ${this.juzuCooldown.toFixed(1)}s` : 'READY',
    ];
    return `${labels[this.current]}  ${sub[this.current]}`;
  }
}

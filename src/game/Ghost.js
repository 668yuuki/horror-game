// おばけ AI
// シンプルな state machine: Patrol / Chase / Stunned / Sealed
// 経路探索は壁衝突を避けながら直接プレイヤーに向かう steering と、
// パトロール用の固定 waypoint 列を使う（プロトタイプとして十分）
import * as THREE from 'three';
import { CONFIG, QUALITY } from '../config.js';

export class Ghost {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./Collision.js').CollisionWorld} collision
   * @param {THREE.Vector3} spawn
   */
  constructor(scene, collision, spawn) {
    this.scene = scene;
    this.collision = collision;
    this.position = spawn.clone();
    this.position.y = 0;
    this.velocity = new THREE.Vector3();

    this.state = 'Patrol';
    this.stunTimer = 0;
    this.attackCooldown = 0;
    this.alive = true;

    const group = new THREE.Group();

    // ===== 白装束のボディ（少し背が高い・痩せている） =====
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe8e2d4, transparent: true, opacity: 0.92,
      emissive: 0x332222, emissiveIntensity: 0.3, roughness: 0.85,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.5, 12, 24), bodyMat);
    body.position.y = 1.05;
    body.scale.set(1.0, 1.0, 0.7);
    group.add(body);
    this.body = body;
    this.bodyMat = bodyMat;

    // ===== 血で汚れた裾 =====
    const hemMat = new THREE.MeshStandardMaterial({
      color: 0xaa1010, transparent: true, opacity: 0.7, roughness: 1.0
    });
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.55, 0.6, 16, 1, true), hemMat);
    hem.position.y = 0.3;
    group.add(hem);

    // ===== ボロボロの長い黒髪（多数の細いストランド） =====
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x050505, transparent: true, opacity: 0.95, roughness: 1.0
    });
    this.hairs = [];
    const HAIR_COUNT = QUALITY.hairCount;
    for (let i = 0; i < HAIR_COUNT; i++) {
      const a = (i / HAIR_COUNT) * Math.PI * 2;
      // 顔の前側は髪を集中させる
      const front = Math.cos(a) > 0 ? 1 : 0;
      const len = 1.1 + Math.random() * 0.6 + front * 0.3;
      const r = 0.03 + Math.random() * 0.015;
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 0.3, len, 5),
        hairMat
      );
      strand.position.set(Math.cos(a) * 0.30, 1.85 - len / 2, Math.sin(a) * 0.30);
      strand.rotation.z = Math.cos(a) * 0.15 + (Math.random() - 0.5) * 0.1;
      strand.rotation.x = Math.sin(a) * 0.15 + (Math.random() - 0.5) * 0.1;
      group.add(strand);
      this.hairs.push({ mesh: strand, baseRotZ: strand.rotation.z, baseRotX: strand.rotation.x, seed: Math.random() * 10 });
    }

    // ===== 蒼白い顔（青みがかった皮膚） =====
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8d4, emissive: 0x441122, emissiveIntensity: 0.4, roughness: 0.85
    });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.30, 24, 18), faceMat);
    face.position.y = 1.85;
    face.scale.set(1, 1.15, 0.78);
    group.add(face);
    this.face = face;
    this.faceMat = faceMat;

    // ===== 落ち窪んだ眼窩（黒いくぼみ） =====
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const socketL = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 8), socketMat);
    const socketR = socketL.clone();
    socketL.scale.set(1, 0.7, 0.5);
    socketR.scale.set(1, 0.7, 0.5);
    socketL.position.set(-0.11, 1.90, 0.22);
    socketR.position.set( 0.11, 1.90, 0.22);
    group.add(socketL, socketR);

    // ===== 中で燃える赤い瞳孔 =====
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.11, 1.90, 0.255);
    eyeR.position.set( 0.11, 1.90, 0.255);
    group.add(eyeL, eyeR);
    this.eyeL = eyeL; this.eyeR = eyeR;

    // 目から滴る赤い線（涙のような）
    const tearMat = new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.85 });
    const tearL = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.18), tearMat);
    const tearR = tearL.clone();
    tearL.position.set(-0.11, 1.80, 0.245);
    tearR.position.set( 0.11, 1.80, 0.245);
    group.add(tearL, tearR);

    // ===== 開いた口（黒い穴） =====
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x080000 });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mouthMat);
    mouth.scale.set(1.0, 1.6, 0.4);
    mouth.position.set(0, 1.74, 0.245);
    group.add(mouth);
    this.mouth = mouth;
    // 口の縁の血
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x660000, transparent: true, opacity: 0.9 });
    const lip = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), lipMat);
    lip.position.set(0, 1.78, 0.252);
    group.add(lip);
    // 顎から流れる血
    const jaw = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.12), tearMat);
    jaw.position.set(0.04, 1.66, 0.245);
    group.add(jaw);

    // ===== 細長い手（前に伸びる） =====
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xc8c0b8, transparent: true, opacity: 0.9, roughness: 0.9
    });
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.9, 8), armMat);
    armL.position.set(-0.32, 1.15, 0.2);
    armL.rotation.x = -Math.PI * 0.3;
    armL.rotation.z = -0.2;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.32;
    armR.rotation.z = 0.2;
    group.add(armR);
    this.armL = armL; this.armR = armR;
    // 爪のような指
    for (const arm of [armL, armR]) {
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.003, 0.16, 5),
          armMat
        );
        finger.position.set(arm.position.x + (arm === armL ? -0.05 : 0.05) + f * 0.03 - 0.045, 0.7, 0.55);
        finger.rotation.x = -Math.PI * 0.45;
        group.add(finger);
      }
    }

    // ===== オーラ（強めの赤紫の不穏な光） =====
    const aura = new THREE.PointLight(0xff3344, 1.4, 6, 2);
    aura.position.y = 1.4;
    group.add(aura);
    this.auraLight = aura;

    // 目のグロー
    const eyeGlow = new THREE.PointLight(0xff1100, 0.9, 2.0, 2);
    eyeGlow.position.set(0, 1.90, 0.35);
    group.add(eyeGlow);
    this.eyeGlow = eyeGlow;

    group.position.copy(this.position);
    scene.add(group);

    this.mesh = group;
    this.body = body;
    this.bodyMat = bodyMat;

    // パトロール waypoint
    this.waypoints = [
      new THREE.Vector3(-16, 0,  10),
      new THREE.Vector3( -2, 0,  10),
      new THREE.Vector3( 12, 0,  10),
      new THREE.Vector3( -2, 0,   0),
      new THREE.Vector3(-16, 0, -10),
      new THREE.Vector3( -2, 0, -10),
      new THREE.Vector3( 10, 0, -10),
    ];
    this.wpIndex = 0;
  }

  isSealed() { return this.state === 'Sealed'; }

  seal() {
    this.state = 'Sealed';
    this.bodyMat.opacity = 0.15;
    this.bodyMat.emissiveIntensity = 0.0;
    this.mesh.visible = false;
  }

  stun(duration) {
    if (this.state === 'Sealed') return;
    this.state = 'Stunned';
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.bodyMat.emissive.setHex(0xffff88);
    if (this.faceMat) this.faceMat.emissive.setHex(0x888866);
  }

  pushBack(awayFromCam, dist) {
    if (this.state === 'Sealed') return;
    // awayFromCam はカメラ→ゴーストの単位ベクトル
    const v = awayFromCam.clone(); v.y = 0; v.normalize();
    const target = this.position.clone().addScaledVector(v, dist);
    // 衝突解決で壁を抜けないようにする
    const move = new THREE.Vector3(target.x - this.position.x, 0, target.z - this.position.z);
    const start = this.position.clone(); start.y = CONFIG.player.height;
    const resolved = this.collision.resolveHorizontal(start, move, 0.45);
    this.position.set(resolved.x, 0, resolved.z);
  }

  // playerPos からの距離・視線で chase に遷移
  _senseAndTransition(playerPos) {
    if (this.state === 'Sealed' || this.state === 'Stunned') return;
    const eye = this.position.clone(); eye.y = 1.6;
    const target = playerPos.clone(); target.y = 1.6;
    const dist = eye.distanceTo(target);
    if (dist > CONFIG.ghost.sightRange) {
      this.state = 'Patrol';
      return;
    }
    if (this.collision.isLineBlocked(eye, target)) {
      // 視線が遮られていても近ければ気配で chase
      if (dist < 4) this.state = 'Chase';
      else this.state = 'Patrol';
      return;
    }
    this.state = 'Chase';
  }

  _moveToward(targetPos, speed, dt) {
    const dir = targetPos.clone().sub(this.position);
    dir.y = 0;
    const len = dir.length();
    if (len < 0.05) return;
    dir.normalize();
    const step = Math.min(len, speed * dt);
    const move = dir.multiplyScalar(step);
    const start = this.position.clone(); start.y = CONFIG.player.height;
    const resolved = this.collision.resolveHorizontal(start, move, 0.45);
    this.position.set(resolved.x, 0, resolved.z);

    // 向きを進行方向に
    const yaw = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = yaw;
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} playerPos
   * @param {import('./Player.js').Player} player
   * @param {number} time
   */
  update(dt, playerPos, player, time) {
    if (!this.alive) return;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.state === 'Stunned') {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.state = 'Patrol';
        this.bodyMat.emissive.setHex(0x332222);
        if (this.faceMat) this.faceMat.emissive.setHex(0x441122);
      }
    } else if (this.state !== 'Sealed') {
      this._senseAndTransition(playerPos);
      if (this.state === 'Patrol') {
        const wp = this.waypoints[this.wpIndex];
        this._moveToward(wp, CONFIG.ghost.speedPatrol, dt);
        if (this.position.distanceTo(wp) < 0.6) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        }
      } else if (this.state === 'Chase') {
        this._moveToward(playerPos, CONFIG.ghost.speedChase, dt);
        // 攻撃
        const d = this.position.distanceTo(playerPos);
        if (d < CONFIG.ghost.attackRange && this.attackCooldown <= 0) {
          if (player.takeDamage()) {
            this.attackCooldown = CONFIG.ghost.attackCooldown;
          }
        }
      }
    }

    // 浮遊アニメーション
    const bob = Math.sin(time * 2.0) * 0.08;
    this.mesh.position.set(this.position.x, bob, this.position.z);

    // ===== 怖さ演出 =====
    const chasing = this.state === 'Chase';
    // 髪を揺らす
    if (this.hairs) {
      const sway = chasing ? 0.5 : 0.18;
      const speed = chasing ? 9 : 4;
      for (const h of this.hairs) {
        h.mesh.rotation.z = h.baseRotZ + Math.sin(time * speed + h.seed) * sway * 0.3;
        h.mesh.rotation.x = h.baseRotX + Math.cos(time * speed * 0.8 + h.seed) * sway * 0.3;
      }
    }
    // 追跡中はオーラと目が脈打つ
    if (this.auraLight) {
      const pulse = chasing
        ? 1.4 + Math.sin(time * 8) * 0.6
        : 0.6 + Math.sin(time * 1.5) * 0.2;
      this.auraLight.intensity = pulse;
    }
    if (this.eyeGlow) {
      this.eyeGlow.intensity = chasing
        ? 1.4 + Math.sin(time * 14) * 0.5
        : 0.7;
    }
    // 口パク（叫んでる感じ）
    if (this.mouth) {
      const open = chasing
        ? 1.5 + Math.abs(Math.sin(time * 6)) * 1.2
        : 1.4;
      this.mouth.scale.y = open;
    }
    // 追跡中は体がブルブル震える
    if (chasing) {
      if (QUALITY.ghostJitter) {
        const j = 0.015;
        this.mesh.position.x += (Math.random() - 0.5) * j;
        this.mesh.position.z += (Math.random() - 0.5) * j;
      }
      // 腕をプレイヤー方向に伸ばす
      if (this.armL && this.armR) {
        this.armL.rotation.x = -Math.PI * 0.45;
        this.armR.rotation.x = -Math.PI * 0.45;
      }
    }
  }

  // プレイヤーから自分までの距離（HUDの心音用）
  distanceTo(p) { return this.position.distanceTo(p); }
}

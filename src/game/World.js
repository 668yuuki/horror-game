// 校舎の1階レイアウトを生成（リアル寄り）
import * as THREE from 'three';
import { CollisionWorld } from './Collision.js';
import {
  woodTextures, plasterTextures, concreteTextures, metalTextures,
  ceilingTextures, blackboardTexture
} from './Textures.js';

const WALL_H = 3.0;
const WALL_T = 0.2;

const ROOMS = [
  { name: 'classroom1', x: -16, z: 10, w: 12, d: 12, door: { side: 'S', offset: 0 }, kind: 'classroom' },
  { name: 'classroom2', x:  -2, z: 10, w: 12, d: 12, door: { side: 'S', offset: 0 }, kind: 'classroom' },
  { name: 'classroom3', x:  12, z: 10, w: 12, d: 12, door: { side: 'S', offset: 0 }, kind: 'classroom' },
  { name: 'staff',      x: -16, z: -10, w: 12, d: 12, door: { side: 'N', offset: 0 }, kind: 'staff' },
  { name: 'toilet',     x:  -2, z: -10, w: 8,  d: 12, door: { side: 'N', offset: 0 }, kind: 'toilet' },
  { name: 'nurse',      x:  10, z: -10, w: 8,  d: 12, door: { side: 'N', offset: 0 }, kind: 'nurse' },
  { name: 'entrance',   x:  16, z:  22, w: 8,  d: 8,  door: { side: 'S', offset: 0 }, kind: 'entrance' },
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.collision = new CollisionWorld();
    this.lights = [];
    this.exitDoorMesh = null;
    this.exitDoorPos = new THREE.Vector3();
    this.spawnPoints = [];
    this.ghostSpawn = new THREE.Vector3(-16, 0, 10);
    this.playerSpawn = new THREE.Vector3(16, 0, 22);

    this._buildMaterials();
    this._build();
  }

  _buildMaterials() {
    const wood = woodTextures([8, 8]);
    const plaster = plasterTextures([4, 1]);
    const concrete = concreteTextures([8, 8]);
    const metal = metalTextures([1, 1]);
    const ceiling = ceilingTextures([12, 12]);

    this.mat = {
      floorWood: new THREE.MeshStandardMaterial({
        map: wood.map, normalMap: wood.normalMap,
        roughness: 0.78, metalness: 0.05,
      }),
      floorConcrete: new THREE.MeshStandardMaterial({
        map: concrete.map, normalMap: concrete.normalMap,
        roughness: 0.95, metalness: 0.0,
      }),
      wall: new THREE.MeshStandardMaterial({
        map: plaster.map, normalMap: plaster.normalMap,
        roughness: 0.95, metalness: 0.0,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        map: ceiling.map, roughness: 1.0, metalness: 0.0, color: 0x222018,
      }),
      desk: new THREE.MeshStandardMaterial({
        map: woodTextures([2, 2]).map, roughness: 0.7, metalness: 0.05, color: 0xaa8855
      }),
      locker: new THREE.MeshStandardMaterial({
        map: metal.map, roughness: 0.4, metalness: 0.85, color: 0x6a7578,
      }),
      door: new THREE.MeshStandardMaterial({
        color: 0x3a2210, roughness: 0.6, metalness: 0.1,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x223344, transparent: true, opacity: 0.25, roughness: 0.05,
        metalness: 0.0, transmission: 0.7, thickness: 0.2,
      }),
      blackboard: new THREE.MeshStandardMaterial({
        map: blackboardTexture(), roughness: 0.7, color: 0x223328
      }),
      tile: new THREE.MeshStandardMaterial({
        color: 0xaaaaa6, roughness: 0.4, metalness: 0.05,
      }),
    };
  }

  _build() {
    const group = new THREE.Group();
    this.scene.add(group);
    this.root = group;

    // 床（廊下=コンクリ、部屋ごとは後で上塗り）
    const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 60), this.mat.floorConcrete);
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // 天井
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 60), this.mat.ceiling);
    ceil.position.set(0, WALL_H + 0.1, 0);
    group.add(ceil);

    // 外周壁
    this._wall(-30, -30, 60, WALL_T, group, this.mat.wall);
    this._wall(-30,  30 - WALL_T, 60, WALL_T, group, this.mat.wall);
    this._wall(-30, -30, WALL_T, 60, group, this.mat.wall);
    this._wall( 30 - WALL_T, -30, WALL_T, 60, group, this.mat.wall);

    // 部屋
    for (const r of ROOMS) {
      this._buildRoom(r, group);
    }

    // 玄関の出口扉
    const doorGeo = new THREE.BoxGeometry(2.4, 2.4, 0.15);
    this.exitDoorMesh = new THREE.Mesh(doorGeo, this.mat.door);
    this.exitDoorMesh.position.set(16, 1.2, 26 - WALL_T - 0.1);
    this.exitDoorMesh.castShadow = true;
    this.exitDoorMesh.receiveShadow = true;
    group.add(this.exitDoorMesh);
    this.exitDoorPos.copy(this.exitDoorMesh.position);
    this.collision.addFromMesh(this.exitDoorMesh);
    // 扉枠
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 0.12), frameMat);
    frame.position.copy(this.exitDoorMesh.position);
    frame.position.z += 0.02;
    group.add(frame);

    // 玄関の靴箱
    for (let i = 0; i < 3; i++) {
      const sb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.4), this.mat.locker);
      sb.position.set(13 + i * 0.75, 0.8, 19);
      sb.castShadow = true; sb.receiveShadow = true;
      group.add(sb);
      this.collision.addFromMesh(sb);
    }

    // 部屋床の上塗り（教室=木、トイレ=タイル等）
    for (const r of ROOMS) this._roomFloor(r, group);

    this._addFurniture(group);

    this.spawnPoints = [
      new THREE.Vector3(-18, 0, 12),
      new THREE.Vector3(-4,  0, 12),
      new THREE.Vector3(14,  0, 12),
      new THREE.Vector3(-18, 0, -12),
      new THREE.Vector3(-4,  0, -12),
      new THREE.Vector3(10,  0, -12),
      new THREE.Vector3(-12, 0, 0),
      new THREE.Vector3(0,   0, 0),
      new THREE.Vector3(16,  0, 8),
      new THREE.Vector3(-20, 0, 8),
    ];

    this._setupLighting();
  }

  _wall(x, z, w, d, parent, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), mat);
    m.position.set(x + w / 2, WALL_H / 2, z + d / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    this.collision.addFromMesh(m);
    return m;
  }

  _roomFloor(r, parent) {
    const mat = (r.kind === 'toilet' || r.kind === 'nurse' || r.kind === 'entrance')
      ? this.mat.tile : this.mat.floorWood;
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(r.w - WALL_T * 2, 0.05, r.d - WALL_T * 2),
      mat
    );
    f.position.set(r.x, 0.025, r.z);
    f.receiveShadow = true;
    parent.add(f);
  }

  _buildRoom(r, parent) {
    const { x, z, w, d, door } = r;
    const x0 = x - w / 2, z0 = z - d / 2;
    const x1 = x + w / 2, z1 = z + d / 2;
    const doorW = 2.0;
    const mat = this.mat.wall;

    const drawSide = (side) => {
      const isHor = side === 'N' || side === 'S';
      const length = isHor ? w : d;
      const wallZ = side === 'N' ? z1 - WALL_T : z0;
      const wallX = side === 'E' ? x1 - WALL_T : x0;

      if (door.side === side) {
        const halfA = (length - doorW) / 2;
        if (isHor) {
          this._wall(x0,                 wallZ, halfA, WALL_T, parent, mat);
          this._wall(x0 + halfA + doorW, wallZ, halfA, WALL_T, parent, mat);
          // 上部の鴨居
          const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(doorW, WALL_H - 2.2, WALL_T),
            mat
          );
          lintel.position.set(x0 + halfA + doorW / 2, 2.2 + (WALL_H - 2.2) / 2, wallZ + WALL_T / 2);
          lintel.castShadow = true; lintel.receiveShadow = true;
          parent.add(lintel);
        } else {
          this._wall(wallX, z0,                 WALL_T, halfA, parent, mat);
          this._wall(wallX, z0 + halfA + doorW, WALL_T, halfA, parent, mat);
          const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_T, WALL_H - 2.2, doorW),
            mat
          );
          lintel.position.set(wallX + WALL_T / 2, 2.2 + (WALL_H - 2.2) / 2, z0 + halfA + doorW / 2);
          lintel.castShadow = true; lintel.receiveShadow = true;
          parent.add(lintel);
        }
      } else {
        if (isHor) this._wall(x0, wallZ, length, WALL_T, parent, mat);
        else       this._wall(wallX, z0, WALL_T, length, parent, mat);
      }
    };
    drawSide('N'); drawSide('S'); drawSide('E'); drawSide('W');

    // 教室には黒板と窓
    if (r.kind === 'classroom') {
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), this.mat.blackboard);
      bb.position.set(r.x, 1.7, r.z + r.d / 2 - WALL_T - 0.01);
      bb.rotation.y = Math.PI;
      parent.add(bb);
      // 窓（外側=南）
      const winFrame = new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), this.mat.glass);
        w1.position.set(r.x - 4 + i * 3, 1.8, r.z - r.d / 2 + WALL_T + 0.02);
        parent.add(w1);
        // 窓枠
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.05), winFrame);
        fr.position.set(r.x - 4 + i * 3, 1.8, r.z - r.d / 2 + WALL_T - 0.01);
        parent.add(fr);
      }
    }
  }

  _addFurniture(parent) {
    // 教室の机と椅子
    for (const cx of [-16, -2, 12]) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const desk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.6), this.mat.desk);
          desk.position.set(cx - 2 + i * 2, 0.75, 6 + j * 1.6);
          desk.castShadow = true; desk.receiveShadow = true;
          parent.add(desk);
          // 脚
          for (const [dx, dz] of [[-0.45,-0.25],[0.45,-0.25],[-0.45,0.25],[0.45,0.25]]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), this.mat.desk);
            leg.position.set(desk.position.x + dx, 0.375, desk.position.z + dz);
            leg.castShadow = true;
            parent.add(leg);
          }
          this.collision.addFromMesh(desk);
          // 椅子
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), this.mat.desk);
          chair.position.set(desk.position.x, 0.45, desk.position.z + 0.7);
          chair.castShadow = true;
          parent.add(chair);
          const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), this.mat.desk);
          back.position.set(chair.position.x, 0.75, chair.position.z + 0.22);
          parent.add(back);
        }
      }
    }

    // 職員室のロッカー
    for (let i = 0; i < 5; i++) {
      const loc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.5), this.mat.locker);
      loc.position.set(-22 + i * 0.85, 1.0, -14);
      loc.castShadow = true; loc.receiveShadow = true;
      parent.add(loc);
      this.collision.addFromMesh(loc);
      // 取っ手
      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1, roughness: 0.3 })
      );
      handle.position.set(loc.position.x + 0.3, 1.0, loc.position.z + 0.26);
      parent.add(handle);
    }
    // 職員室の机
    for (let i = 0; i < 2; i++) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), this.mat.desk);
      desk.position.set(-14 - i * 2.2, 0.8, -8);
      desk.castShadow = true; desk.receiveShadow = true;
      parent.add(desk);
      this.collision.addFromMesh(desk);
    }

    // 保健室のベッドとカーテン
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 1.0), this.mat.desk);
    bed.position.set(8, 0.2, -13);
    bed.castShadow = true; bed.receiveShadow = true;
    parent.add(bed);
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.05, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 })
    );
    sheet.position.set(8, 0.42, -13);
    parent.add(sheet);
    this.collision.addFromMesh(bed);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xddddee, roughness: 0.9 })
    );
    pillow.position.set(7.3, 0.5, -13);
    parent.add(pillow);

    // トイレの便器（簡易）
    for (let i = 0; i < 3; i++) {
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.05 })
      );
      stool.position.set(-4, 0.225, -13 + i * 1.5);
      stool.castShadow = true; stool.receiveShadow = true;
      parent.add(stool);
      this.collision.addFromMesh(stool);
    }
  }

  _setupLighting() {
    // 全体的に底上げ（不気味さは保ちつつ視認性UP）
    const amb = new THREE.AmbientLight(0x2a3040, 0.7);
    this.scene.add(amb);
    // 月明かり
    const moon = new THREE.DirectionalLight(0x99aadd, 0.5);
    moon.position.set(20, 30, -20);
    this.scene.add(moon);

    // 蛍光灯
    const fixtures = [
      [-16, 2.7,  0], [-4, 2.7,  0], [8, 2.7,  0],
      [16, 2.7, 12], [16, 2.7, 22],
      [-16, 2.7, 10], [-2, 2.7, 10], [12, 2.7, 10],
      [-16, 2.7,-10], [-2, 2.7,-10], [10, 2.7,-10],
    ];
    for (const [x, y, z] of fixtures) {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.06, 0.25),
        new THREE.MeshStandardMaterial({
          color: 0xffeebb, emissive: 0xffeebb, emissiveIntensity: 2.0
        })
      );
      lamp.position.set(x, y + 0.2, z);
      this.scene.add(lamp);

      // 範囲を 14 → 26、強度 0.8 → 1.6 に
      const l = new THREE.PointLight(0xffeeaa, 1.6, 26, 1.6);
      l.position.set(x, y, z);
      l.castShadow = true;
      l.shadow.mapSize.set(256, 256);
      l.shadow.camera.near = 0.5;
      l.shadow.camera.far = 26;
      l.shadow.bias = -0.005;
      this.scene.add(l);
      this.lights.push({
        light: l, lamp, base: 1.6,
        flicker: Math.random() < 0.3, // ちらつくのは少なめに
        seed: Math.random() * 10
      });
    }
  }

  update(dt, time) {
    for (const e of this.lights) {
      if (!e.flicker) continue;
      const f = 0.7 + Math.sin(time * 12 + e.seed * 7) * 0.18
                    + (Math.random() - 0.5) * 0.25;
      const v = Math.max(0.05, e.base * f);
      e.light.intensity = v;
      if (e.lamp) e.lamp.material.emissiveIntensity = v * 1.8;
    }
  }
}

// 軸並行バウンディングボックス（AABB）の集合に対する衝突判定
import * as THREE from 'three';

export class CollisionWorld {
  constructor() {
    /** @type {THREE.Box3[]} */
    this.boxes = [];
  }

  addBox(min, max) {
    this.boxes.push(new THREE.Box3(min.clone(), max.clone()));
  }

  addFromMesh(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.boxes.push(box);
    return box;
  }

  // 円柱（プレイヤー想定）の水平移動を壁でクリップする
  // pos: 現在位置 (THREE.Vector3) / move: Vector3 (y は別で扱う) / radius
  // 戻り値: 移動後の new pos
  resolveHorizontal(pos, move, radius) {
    const out = pos.clone();
    out.x += move.x;
    for (const b of this.boxes) {
      // y方向に重なっていなければスキップ
      if (out.y + 0.1 < b.min.y || out.y - 1.7 > b.max.y) continue;
      const closestX = Math.max(b.min.x, Math.min(out.x, b.max.x));
      const closestZ = Math.max(b.min.z, Math.min(out.z, b.max.z));
      const dx = out.x - closestX;
      const dz = out.z - closestZ;
      if (dx * dx + dz * dz < radius * radius) {
        // X方向のみ補正
        if (move.x > 0) out.x = b.min.x - radius - 0.001;
        else if (move.x < 0) out.x = b.max.x + radius + 0.001;
      }
    }
    out.z += move.z;
    for (const b of this.boxes) {
      if (out.y + 0.1 < b.min.y || out.y - 1.7 > b.max.y) continue;
      const closestX = Math.max(b.min.x, Math.min(out.x, b.max.x));
      const closestZ = Math.max(b.min.z, Math.min(out.z, b.max.z));
      const dx = out.x - closestX;
      const dz = out.z - closestZ;
      if (dx * dx + dz * dz < radius * radius) {
        if (move.z > 0) out.z = b.min.z - radius - 0.001;
        else if (move.z < 0) out.z = b.max.z + radius + 0.001;
      }
    }
    return out;
  }

  // 視線が壁で遮られているか（おばけの視認用）
  // a, b は Vector3
  isLineBlocked(a, b) {
    const ray = new THREE.Ray(a.clone(), b.clone().sub(a).normalize());
    const dist = a.distanceTo(b);
    const hit = new THREE.Vector3();
    for (const box of this.boxes) {
      // y方向に大きすぎるボックスはスキップしないが、上下端は無視できない
      if (ray.intersectBox(box, hit)) {
        if (a.distanceTo(hit) < dist) return true;
      }
    }
    return false;
  }

  // 点が任意のボックス内にあるか（地面以外）
  pointInsideAny(p) {
    for (const b of this.boxes) {
      if (p.x > b.min.x && p.x < b.max.x &&
          p.y > b.min.y && p.y < b.max.y &&
          p.z > b.min.z && p.z < b.max.z) return true;
    }
    return false;
  }
}

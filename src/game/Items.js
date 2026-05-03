// お札・強化アイテム
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ofudaTexture } from './Textures.js';

let _id = 0;
let _ofudaTex = null;

function makeOfudaMesh() {
  if (!_ofudaTex) _ofudaTex = ofudaTexture();
  const g = new THREE.PlaneGeometry(0.3, 0.5);
  const m = new THREE.MeshStandardMaterial({
    map: _ofudaTex,
    emissive: 0xaa3333, emissiveIntensity: 0.6,
    side: THREE.DoubleSide, roughness: 0.7,
  });
  const mesh = new THREE.Mesh(g, m);
  // 取得補助の淡い光
  const halo = new THREE.PointLight(0xff4444, 0.4, 1.6, 2);
  halo.position.set(0, 0, 0);
  mesh.add(halo);
  return mesh;
}

function makePotionMesh(color) {
  const g = new THREE.CylinderGeometry(0.1, 0.12, 0.3, 12);
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 });
  return new THREE.Mesh(g, m);
}

function makeSaltPouch() {
  const g = new THREE.SphereGeometry(0.2, 12, 8);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  return new THREE.Mesh(g, m);
}

function makeBattery() {
  const g = new THREE.BoxGeometry(0.18, 0.32, 0.18);
  const m = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.7 });
  return new THREE.Mesh(g, m);
}

export class ItemManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.items = []; // { id, type, mesh, position, picked }
  }

  // type: 'ofuda' | 'speed' | 'jump' | 'salt' | 'battery'
  spawn(type, position) {
    let mesh;
    switch (type) {
      case 'ofuda':   mesh = makeOfudaMesh(); break;
      case 'speed':   mesh = makePotionMesh(0x44ff66); break;
      case 'jump':    mesh = makePotionMesh(0x66aaff); break;
      case 'salt':    mesh = makeSaltPouch(); break;
      case 'battery': mesh = makeBattery(); break;
      default: return null;
    }
    mesh.position.copy(position);
    mesh.position.y = type === 'ofuda' ? 1.2 : 0.5;
    this.scene.add(mesh);
    const item = { id: _id++, type, mesh, basePos: mesh.position.clone(), picked: false };
    this.items.push(item);
    return item;
  }

  // プレイヤー位置に対し、近くにあるアイテムを返す
  findNearest(playerPos, range = 1.5) {
    let nearest = null;
    let bestDist = range;
    for (const it of this.items) {
      if (it.picked) continue;
      const d = it.mesh.position.distanceTo(playerPos);
      if (d < bestDist) { bestDist = d; nearest = it; }
    }
    return nearest;
  }

  pick(item) {
    item.picked = true;
    this.scene.remove(item.mesh);
    item.mesh.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  update(dt, time) {
    // 浮遊・回転アニメーション
    for (const it of this.items) {
      if (it.picked) continue;
      it.mesh.rotation.y += dt * 1.5;
      it.mesh.position.y = it.basePos.y + Math.sin(time * 2 + it.basePos.x) * 0.08;
    }
  }
}

// Canvas で PBR っぽいテクスチャをプロシージャル生成
// (color + roughness + normal を返す)
import * as THREE from 'three';
import { QUALITY } from '../config.js';

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// 色画像から normal map を作る（高さ=明度として中央差分）
function colorToNormal(canvas, strength = 1.0) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  const get = (x, y) => {
    x = (x + w) % w; y = (y + h) % h;
    const i = (y * w + x) * 4;
    return (src[i] + src[i+1] + src[i+2]) / (3 * 255);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (get(x + 1, y) - get(x - 1, y)) * strength;
      const dy = (get(x, y + 1) - get(x, y - 1)) * strength;
      const nx = -dx, ny = -dy, nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      out.data[i]   = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i+1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i+2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i+3] = 255;
    }
  }
  const nc = makeCanvas(w);
  nc.getContext('2d').putImageData(out, 0, 0);
  return new THREE.CanvasTexture(nc);
}

// ===== 木材（教室の床・机） =====
export function woodTextures(repeat = [4, 4]) {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    const grad = ctx.createLinearGradient(0, y, 0, y + 32);
    grad.addColorStop(0, `rgba(0,0,0,${0.15 + Math.random() * 0.1})`);
    grad.addColorStop(0.5, 'rgba(255,210,160,0.05)');
    grad.addColorStop(1, `rgba(0,0,0,${0.18 + Math.random() * 0.1})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, 512, 32);
    // 木目のスジ
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(40,20,10,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const sy = y + Math.random() * 32;
      ctx.moveTo(0, sy);
      for (let x = 0; x <= 512; x += 16) {
        ctx.lineTo(x, sy + Math.sin(x * 0.04 + y) * 1.5);
      }
      ctx.stroke();
    }
  }
  // ノイズ
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 30;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1] + n));
    img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.colorSpace = THREE.SRGBColorSpace;
  if (!QUALITY.generateNormalMaps) return { map };
  const normal = colorToNormal(c, 4);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(...repeat);
  return { map, normalMap: normal };
}

// ===== 壁の漆喰/コンクリート =====
export function plasterTextures(repeat = [4, 2]) {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a89a82';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = Math.random() * 1.5;
    const a = Math.random() * 0.4;
    ctx.fillStyle = `rgba(${60 + Math.random() * 40},${50 + Math.random() * 30},${40 + Math.random() * 30},${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // シミ
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = 20 + Math.random() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(40,30,20,0.3)');
    grd.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.colorSpace = THREE.SRGBColorSpace;
  if (!QUALITY.generateNormalMaps) return { map };
  const normal = colorToNormal(c, 1.5);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(...repeat);
  return { map, normalMap: normal };
}

// ===== コンクリート床（廊下） =====
export function concreteTextures(repeat = [6, 6]) {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = 30 + Math.random() * 50;
    ctx.fillStyle = `rgba(${v},${v - 5},${v - 10},${Math.random() * 0.5})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // ひび割れ
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let j = 0; j < 12; j++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.colorSpace = THREE.SRGBColorSpace;
  if (!QUALITY.generateNormalMaps) return { map };
  const normal = colorToNormal(c, 2);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(...repeat);
  return { map, normalMap: normal };
}

// ===== 金属（ロッカー） =====
export function metalTextures(repeat = [1, 1]) {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a6a6e';
  ctx.fillRect(0, 0, 256, 256);
  // ヘアライン
  for (let y = 0; y < 256; y += 1) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + 0.5); ctx.stroke();
  }
  // サビ
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = 4 + Math.random() * 12;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(120,60,20,0.55)');
    grd.addColorStop(1, 'rgba(120,60,20,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map };
}

// ===== 天井タイル =====
export function ceilingTextures(repeat = [10, 10]) {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1814';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#0a0805';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(${20 + Math.random() * 30},${20 + Math.random() * 30},${20 + Math.random() * 25},${Math.random() * 0.6})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map };
}

// ===== お札（紙にお経風の文字） =====
export function ofudaTexture() {
  const c = makeCanvas(128);
  const ctx = c.getContext('2d');
  // 紙
  const grd = ctx.createLinearGradient(0, 0, 128, 128);
  grd.addColorStop(0, '#f5e8b8');
  grd.addColorStop(1, '#d8c08a');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
  // 朱の縁
  ctx.fillStyle = '#aa1818';
  ctx.fillRect(0, 0, 128, 6);
  ctx.fillRect(0, 122, 128, 6);
  // 縦書き文字
  ctx.fillStyle = '#1a1410';
  ctx.font = 'bold 14px serif';
  ctx.textBaseline = 'top';
  const lines = ['急', '急', '如', '律', '令'];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 56, 18 + i * 16);
  }
  // 朱印
  ctx.fillStyle = 'rgba(170,30,30,0.85)';
  ctx.fillRect(48, 96, 24, 18);
  // ノイズ
  const img = ctx.getImageData(0, 0, 128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    img.data[i] += n; img.data[i+1] += n; img.data[i+2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ===== 黒板 =====
export function blackboardTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a2a20';
  ctx.fillRect(0, 0, 512, 512);
  // チョーク残り
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }
  // 不気味なメッセージ
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 36px serif';
  ctx.fillText('にげて', 200, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

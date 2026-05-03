// マウス視点 (PointerLock) + キー入力
import * as THREE from 'three';

export class Controls {
  /**
   * @param {THREE.Camera} camera
   * @param {HTMLElement} domElement
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.enabled = false;
    this.sensitivity = 0.0022;

    this.yaw = 0;
    this.pitch = 0;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.keys = new Set();
    this.mouseDown = false;
    this.clickQueued = false;     // 1フレームだけ立つフラグ

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  lock() { this.dom.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  _onPointerLockChange() {
    this.enabled = document.pointerLockElement === this.dom;
  }

  _onMouseMove(e) {
    if (!this.enabled) return;
    this.yaw   -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    const lim = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }

  _onKeyDown(e) {
    this.keys.add(e.code);
  }
  _onKeyUp(e) {
    this.keys.delete(e.code);
  }
  _onMouseDown(e) {
    if (!this.enabled) return;
    if (e.button === 0) {
      this.mouseDown = true;
      this.clickQueued = true;
    }
  }
  _onMouseUp(e) {
    if (e.button === 0) this.mouseDown = false;
  }

  // 1フレーム消費する
  consumeClick() {
    const c = this.clickQueued;
    this.clickQueued = false;
    return c;
  }

  // 入力ベクトルを yaw に基づくワールド方向に変換
  getMoveVector() {
    const f = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const r = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    if (f === 0 && r === 0) return new THREE.Vector3();
    // カメラの yaw だけ使う
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward = (-sin, 0, -cos)
    const fwd = new THREE.Vector3(-sin, 0, -cos);
    const right = new THREE.Vector3(cos, 0, -sin);
    const v = new THREE.Vector3();
    v.addScaledVector(fwd, f).addScaledVector(right, r);
    if (v.lengthSq() > 0) v.normalize();
    return v;
  }

  isJumpPressed() { return this.keys.has('Space'); }
  isRunPressed() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  isInteractPressed() { return this.keys.has('KeyE'); }

  weaponSlotPressed() {
    if (this.keys.has('Digit1')) return 0;
    if (this.keys.has('Digit2')) return 1;
    if (this.keys.has('Digit3')) return 2;
    return -1;
  }
}

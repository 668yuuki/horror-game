// マウス視点 (PointerLock) + キー入力 + タッチ入力
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
    this.touchSensitivity = 0.005;

    this.yaw = 0;
    this.pitch = 0;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.keys = new Set();
    this.mouseDown = false;
    this.clickQueued = false;     // 1フレームだけ立つフラグ

    // タッチ
    this.touchMode = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this._stickVec = new THREE.Vector2(0, 0); // x: right, y: forward
    this._stickPointerId = null;
    this._lookPointerId = null;
    this._lastLook = { x: 0, y: 0 };
    this._mobileKeys = { jump: false, run: false, interact: false };
    this._mobileWeaponSlot = -1;

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

    if (this.touchMode) {
      document.body.classList.add('is-touch');
      this._setupTouch();
    }
  }

  lock() { if (!this.touchMode) this.dom.requestPointerLock(); }
  unlock() { if (!this.touchMode) document.exitPointerLock(); }

  _onPointerLockChange() {
    this.enabled = document.pointerLockElement === this.dom;
  }

  _onMouseMove(e) {
    if (!this.enabled || this.touchMode) return;
    this.yaw   -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    this._applyRotation();
  }

  _applyRotation() {
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
    if (!this.enabled || this.touchMode) return;
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

  // ===== タッチ入力 =====
  _setupTouch() {
    const lookArea  = document.getElementById('look-area');
    const stickBase = document.getElementById('stick-base');
    const stickKnob = document.getElementById('stick-knob');
    const btnFire   = document.getElementById('btn-fire');
    const btnJump   = document.getElementById('btn-jump');
    const btnRun    = document.getElementById('btn-run');
    const btnAct    = document.getElementById('btn-act');
    const wbtns     = document.querySelectorAll('#weapon-switch .wbtn');

    // ----- 視点スワイプ -----
    if (lookArea) {
      lookArea.addEventListener('pointerdown', (e) => {
        if (this._lookPointerId !== null) return;
        this._lookPointerId = e.pointerId;
        this._lastLook.x = e.clientX;
        this._lastLook.y = e.clientY;
        try { lookArea.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      lookArea.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this._lookPointerId) return;
        const dx = e.clientX - this._lastLook.x;
        const dy = e.clientY - this._lastLook.y;
        this._lastLook.x = e.clientX;
        this._lastLook.y = e.clientY;
        this.yaw   -= dx * this.touchSensitivity;
        this.pitch -= dy * this.touchSensitivity;
        this._applyRotation();
        e.preventDefault();
      });
      const endLook = (e) => {
        if (e.pointerId !== this._lookPointerId) return;
        this._lookPointerId = null;
      };
      lookArea.addEventListener('pointerup', endLook);
      lookArea.addEventListener('pointercancel', endLook);
    }

    // ----- 仮想スティック -----
    if (stickBase) {
      const updateStick = (e) => {
        const r = stickBase.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let dx = e.clientX - cx;
        let dy = e.clientY - cy;
        const max = r.width / 2;
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        this._stickVec.x = dx / max;
        this._stickVec.y = -dy / max; // 上方向 = forward = +
        if (stickKnob) {
          stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      };
      stickBase.addEventListener('pointerdown', (e) => {
        this._stickPointerId = e.pointerId;
        try { stickBase.setPointerCapture(e.pointerId); } catch (_) {}
        updateStick(e);
        e.preventDefault();
      });
      stickBase.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this._stickPointerId) return;
        updateStick(e);
        e.preventDefault();
      });
      const endStick = (e) => {
        if (e.pointerId !== this._stickPointerId) return;
        this._stickPointerId = null;
        this._stickVec.set(0, 0);
        if (stickKnob) stickKnob.style.transform = 'translate(-50%, -50%)';
      };
      stickBase.addEventListener('pointerup', endStick);
      stickBase.addEventListener('pointercancel', endStick);
    }

    // ----- ボタン (押している間 true) -----
    const bindHold = (el, key) => {
      if (!el) return;
      const on = (e) => {
        this._mobileKeys[key] = true;
        el.classList.add('pressed');
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      };
      const off = () => {
        this._mobileKeys[key] = false;
        el.classList.remove('pressed');
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    bindHold(btnJump, 'jump');
    bindHold(btnRun,  'run');
    bindHold(btnAct,  'interact');

    // ----- 射撃ボタン (押した瞬間 1回 fire) -----
    if (btnFire) {
      btnFire.addEventListener('pointerdown', (e) => {
        this.clickQueued = true;
        btnFire.classList.add('pressed');
        try { btnFire.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      const off = () => btnFire.classList.remove('pressed');
      btnFire.addEventListener('pointerup', off);
      btnFire.addEventListener('pointercancel', off);
      btnFire.addEventListener('pointerleave', off);
    }

    // ----- 武器切替 -----
    wbtns.forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        const slot = parseInt(btn.dataset.slot, 10);
        if (!isNaN(slot)) this._mobileWeaponSlot = slot;
        wbtns.forEach((b) => b.classList.toggle('active', b === btn));
        e.preventDefault();
      });
    });
  }

  // 入力ベクトルを yaw に基づくワールド方向に変換
  getMoveVector() {
    let f = 0, r = 0;
    if (this.touchMode && (this._stickVec.x !== 0 || this._stickVec.y !== 0)) {
      f = this._stickVec.y;
      r = this._stickVec.x;
    } else {
      f = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
      r = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    }
    if (f === 0 && r === 0) return new THREE.Vector3();
    // カメラの yaw だけ使う
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward = (-sin, 0, -cos)
    const fwd = new THREE.Vector3(-sin, 0, -cos);
    const right = new THREE.Vector3(cos, 0, -sin);
    const v = new THREE.Vector3();
    v.addScaledVector(fwd, f).addScaledVector(right, r);
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  isJumpPressed() { return this._mobileKeys.jump || this.keys.has('Space'); }
  isRunPressed() { return this._mobileKeys.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  isInteractPressed() { return this._mobileKeys.interact || this.keys.has('KeyE'); }

  weaponSlotPressed() {
    if (this._mobileWeaponSlot >= 0) {
      const s = this._mobileWeaponSlot;
      this._mobileWeaponSlot = -1;
      return s;
    }
    if (this.keys.has('Digit1')) return 0;
    if (this.keys.has('Digit2')) return 1;
    if (this.keys.has('Digit3')) return 2;
    return -1;
  }
}

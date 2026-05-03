// プレイヤー (つぐみ)
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Player {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('./Collision.js').CollisionWorld} collision
   */
  constructor(camera, collision) {
    this.camera = camera;
    this.collision = collision;

    this.position = new THREE.Vector3(0, CONFIG.player.height, 0);
    this.velocityY = 0;
    this.onGround = true;

    this.hp = CONFIG.player.maxHP;
    this.invuln = 0;
    this.stamina = CONFIG.player.maxStamina;

    // バフ
    this.speedBuff = 0;
    this.jumpBuff = 0;

    this.alive = true;

    // 歩行bob用
    this.bobPhase = 0;
  }

  setPosition(p) {
    this.position.copy(p);
    this.position.y = CONFIG.player.height;
    this.camera.position.copy(this.position);
  }

  takeDamage() {
    if (this.invuln > 0 || !this.alive) return false;
    this.hp -= 1;
    this.invuln = CONFIG.player.invulnTime;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  applyBuff(kind) {
    if (kind === 'speed') this.speedBuff = CONFIG.buff.duration;
    else if (kind === 'jump') this.jumpBuff = CONFIG.buff.duration;
  }

  // controls: Controls / dt: 秒
  update(dt, controls) {
    if (!this.alive) return;
    const C = CONFIG.player;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.speedBuff > 0) this.speedBuff -= dt;
    if (this.jumpBuff > 0) this.jumpBuff -= dt;

    // ===== 水平移動 =====
    const wantRun = controls.isRunPressed() && this.stamina > 0;
    const baseSpeed = wantRun ? C.runSpeed : C.walkSpeed;
    const speed = baseSpeed * (this.speedBuff > 0 ? CONFIG.buff.speedMul : 1);
    const moveDir = controls.getMoveVector();
    const horizontalMove = moveDir.multiplyScalar(speed * dt);

    if (wantRun && moveDir.lengthSq() > 0) {
      this.stamina = Math.max(0, this.stamina - C.staminaDrain * dt);
    } else {
      this.stamina = Math.min(C.maxStamina, this.stamina + C.staminaRegen * dt);
    }

    // ===== ジャンプと重力 =====
    if (controls.isJumpPressed() && this.onGround) {
      const jv = C.jumpVelocity * (this.jumpBuff > 0 ? CONFIG.buff.jumpMul : 1);
      this.velocityY = jv;
      this.onGround = false;
    }
    this.velocityY -= C.gravity * dt;

    // 仮の Y 移動
    let nextY = this.position.y + this.velocityY * dt;
    if (nextY <= C.height) {
      nextY = C.height;
      this.velocityY = 0;
      this.onGround = true;
    }

    // ===== 衝突解決（水平のみ） =====
    const before = new THREE.Vector3(this.position.x, nextY, this.position.z);
    const resolved = this.collision.resolveHorizontal(before, horizontalMove, C.radius);
    this.position.set(resolved.x, nextY, resolved.z);

    // 歩行 bob
    if (this.onGround && horizontalMove.lengthSq() > 0.0001) {
      this.bobPhase += dt * (wantRun ? 12 : 8);
    }
    const bobY = Math.sin(this.bobPhase) * 0.04;
    this.camera.position.set(this.position.x, this.position.y + bobY, this.position.z);
  }
}

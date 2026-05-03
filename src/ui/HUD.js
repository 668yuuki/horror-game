// HUD 更新
export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.elHP = document.getElementById('hp');
    this.elOfuda = document.getElementById('ofuda');
    this.elWeapon = document.getElementById('weapon');
    this.elStamina = document.getElementById('stamina');
    this.elEffects = document.getElementById('effects');
    this.elMessage = document.getElementById('message');
    this.elDamage = document.getElementById('damage-flash');
    this._msgTimer = 0;
    this._dmgTimer = 0;
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setHP(hp, maxHP) {
    this.elHP.textContent = '♥'.repeat(hp) + '♡'.repeat(maxHP - hp);
  }
  setOfuda(n, total) {
    this.elOfuda.textContent = `お札 ${n} / ${total}`;
  }
  setWeapon(text) {
    this.elWeapon.textContent = text;
  }
  setStamina(v, max) {
    this.elStamina.style.width = `${(v / max) * 100}%`;
  }
  setEffects(speed, jump) {
    let html = '';
    if (speed > 0) html += `<div>足速 ${speed.toFixed(0)}s</div>`;
    if (jump > 0)  html += `<div>跳躍 ${jump.toFixed(0)}s</div>`;
    this.elEffects.innerHTML = html;
  }

  flashDamage() {
    this.elDamage.classList.add('show');
    this._dmgTimer = 0.25;
  }
  message(text, duration = 2.0) {
    this.elMessage.textContent = text;
    this.elMessage.classList.add('show');
    this._msgTimer = duration;
  }

  update(dt) {
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this.elMessage.classList.remove('show');
    }
    if (this._dmgTimer > 0) {
      this._dmgTimer -= dt;
      if (this._dmgTimer <= 0) this.elDamage.classList.remove('show');
    }
  }
}

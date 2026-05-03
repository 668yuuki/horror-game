// エントリポイント: シーン構築・ゲームループ
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { World } from './game/World.js';
import { Controls } from './game/Controls.js';
import { Player } from './game/Player.js';
import { ItemManager } from './game/Items.js';
import { WeaponSystem } from './game/Weapons.js';
import { Ghost } from './game/Ghost.js';
import { AudioManager } from './game/Audio.js';
import { PostFX } from './game/PostFX.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';

class Game {
  constructor() {
    this.container = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.035);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
    this.scene.add(this.camera);

    this.clock = new THREE.Clock();
    this.running = false;
    this.cleared = false;

    this.hud = new HUD();
    this.screens = new Screens();
    this.audio = new AudioManager();

    this.screens.onStart       = () => this.start();
    this.screens.onRetry       = () => this.start();
    this.screens.onBackToTitle = () => { this.screens.showTitle(); };

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('click', () => {
      if (this.running && this.controls && !this.controls.enabled && !this.controls.touchMode) {
        this.controls.lock();
      }
    });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.postfx) this.postfx.setSize(window.innerWidth, window.innerHeight);
  }

  _resetScene() {
    // 既存シーン要素削除
    while (this.scene.children.length > 0) {
      const c = this.scene.children[0];
      this.scene.remove(c);
    }
    this.scene.add(this.camera);
  }

  start() {
    this._resetScene();
    this.cleared = false;

    this.world = new World(this.scene);
    this.controls = new Controls(this.camera, this.renderer.domElement);
    this.player = new Player(this.camera, this.world.collision);
    this.player.setPosition(this.world.playerSpawn);

    this.items = new ItemManager(this.scene);
    // お札6枚を最初の6つの spawn point に
    const sp = this.world.spawnPoints;
    for (let i = 0; i < CONFIG.ofuda.total; i++) this.items.spawn('ofuda', sp[i]);
    // 強化アイテム
    this.items.spawn('speed', sp[6]);
    this.items.spawn('jump',  sp[7]);
    this.items.spawn('salt',  sp[8]);
    this.items.spawn('salt',  sp[9]);

    this.ghost = new Ghost(this.scene, this.world.collision, this.world.ghostSpawn);
    this.weapons = new WeaponSystem(this.scene, this.camera, this.ghost, this.world.collision);
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);

    this.ofudaCount = 0;
    this.sealed = false;

    this.screens.hideAll();
    this.hud.show(true);
    this.hud.setHP(this.player.hp, CONFIG.player.maxHP);
    this.hud.setOfuda(0, CONFIG.ofuda.total);
    this.hud.setStamina(this.player.stamina, CONFIG.player.maxStamina);
    this.hud.setWeapon(this.weapons.status());
    if (this.controls.touchMode) {
      this.hud.message('画面右をなぞって視点操作', 3.0);
    } else {
      this.hud.message('クリックして視点をロック', 3.0);
    }

    this.audio.start();
    this.running = true;
    if (this.controls.touchMode) {
      this.controls.enabled = true;
    } else {
      this.controls.lock();
    }
    this.clock.start();
    this._tick();
  }

  _tick() {
    if (!this.running) return;
    requestAnimationFrame(() => this._tick());
    const dt = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;

    // ===== 入力 → 武器切替 =====
    const slot = this.controls.weaponSlotPressed();
    if (slot >= 0 && slot !== this.weapons.current) {
      this.weapons.setCurrent(slot);
    }

    // ===== Player 更新 =====
    if (this.controls.enabled && this.player.alive && !this.cleared) {
      this.player.update(dt, this.controls);
    }

    // ===== 武器使用 =====
    if (this.controls.consumeClick() && this.controls.enabled && this.player.alive && !this.cleared) {
      this.weapons.fire();
      if (this.weapons.current === 1) this.audio.saltThrow();
      else if (this.weapons.current === 2) this.audio.juzu();
    }
    this.weapons.update(dt);

    // ===== ゴースト更新 =====
    this.ghost.update(dt, this.player.position, this.player, time);

    // ===== ワールド・アイテム =====
    this.world.update(dt, time);
    this.items.update(dt, time);

    // ===== 拾得 / 封印 =====
    if (this.controls.isInteractPressed() && !this.cleared) {
      const it = this.items.findNearest(this.player.position, 1.6);
      if (it) {
        this._pickItem(it);
      } else if (this.ofudaCount >= CONFIG.ofuda.total &&
                 this.player.position.distanceTo(this.world.exitDoorPos) < 2.5) {
        this._sealAndClear();
      }
    }

    // ===== ダメージ判定 =====
    if (this.player.hp < this._lastHP) {
      this.hud.flashDamage();
      this.audio.damage();
      this.postfx.pulseDamage();
    }
    this._lastHP = this.player.hp;

    if (!this.player.alive && this.running && !this.cleared) {
      this.running = false;
      this.controls.unlock();
      this.controls.enabled = false;
      this.hud.show(false);
      this.screens.showGameOver();
      return;
    }

    // ===== HUD 更新 =====
    this.hud.update(dt);
    this.hud.setHP(this.player.hp, CONFIG.player.maxHP);
    this.hud.setOfuda(this.ofudaCount, CONFIG.ofuda.total);
    this.hud.setStamina(this.player.stamina, CONFIG.player.maxStamina);
    this.hud.setWeapon(this.weapons.status());
    this.hud.setEffects(this.player.speedBuff, this.player.jumpBuff);

    // ===== 心音 =====
    this.audio.updateHeartbeat(dt, this.ghost.distanceTo(this.player.position));

    this.postfx.render(dt, time);
  }

  _pickItem(it) {
    this.items.pick(it);
    this.audio.pickup();
    switch (it.type) {
      case 'ofuda':
        this.ofudaCount += 1;
        this.hud.message(`お札を拾った  ${this.ofudaCount} / ${CONFIG.ofuda.total}`, 1.5);
        if (this.ofudaCount >= CONFIG.ofuda.total) {
          this.hud.message('全てのお札を集めた！玄関の扉へ向かえ', 3.0);
        }
        break;
      case 'speed':
        this.player.applyBuff('speed');
        this.hud.message('足速ポーション: 30秒間スピードUP', 2.0);
        break;
      case 'jump':
        this.player.applyBuff('jump');
        this.hud.message('跳躍ポーション: 30秒間ジャンプUP', 2.0);
        break;
      case 'salt':
        this.weapons.addSalt(5);
        this.hud.message('塩を補充した (+5)', 1.5);
        break;
      case 'battery':
        this.weapons.addBattery(60);
        this.hud.message('バッテリーを補充した', 1.5);
        break;
    }
  }

  _sealAndClear() {
    this.cleared = true;
    this.ghost.seal();
    this.audio.seal();
    this.hud.message('扉を封印した！', 2.0);
    setTimeout(() => {
      this.running = false;
      this.controls.unlock();
      this.controls.enabled = false;
      this.hud.show(false);
      this.screens.showClear();
    }, 1800);
  }
}

const game = new Game();
game._lastHP = CONFIG.player.maxHP;
game.screens.showTitle();

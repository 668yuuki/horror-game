// 品質プリセット (端末ごとの軽量化)
const _isTouch = typeof window !== 'undefined' &&
  (('ontouchstart' in window) ||
   (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

export const QUALITY = {
  isMobile: _isTouch,
  pixelRatioCap: _isTouch ? 1.0 : 1.25,
  postFX: !_isTouch,
  shadowMapSize: _isTouch ? 512 : 1024,
  flashlightShadow: !_isTouch,
  pointLightFlicker: !_isTouch,
  ghostJitter: !_isTouch,
  generateNormalMaps: !_isTouch,
  hairCount: _isTouch ? 12 : 20,
  cameraFar: _isTouch ? 60 : 80,
};

// ゲーム全体の定数
export const CONFIG = {
  player: {
    height: 1.7,
    radius: 0.35,
    walkSpeed: 4.0,
    runSpeed: 7.0,
    jumpVelocity: 5.5,
    gravity: 18.0,
    maxHP: 3,
    invulnTime: 1.5,
    maxStamina: 100,
    staminaDrain: 25,   // /sec while running
    staminaRegen: 18,   // /sec while not running
  },
  ghost: {
    speedPatrol: 1.6,
    speedChase: 3.6,
    sightRange: 14,
    sightFov: Math.PI * 0.9,
    attackRange: 1.0,
    attackCooldown: 1.5,
    stunDuration: 3.0,
  },
  ofuda: {
    total: 6,
  },
  weapons: {
    flashlight: { batteryMax: 100, batteryDrain: 0 },   // 無制限（消耗なし）
    salt:       { initial: 5, stunOnHit: 3.0, throwSpeed: 14 },
    juzu:       { range: 2.5, pushBack: 4.0, cooldown: 1.5 },
  },
  buff: {
    duration: 30,
    speedMul: 1.5,
    jumpMul: 1.5,
  },
};

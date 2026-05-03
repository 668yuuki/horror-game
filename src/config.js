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

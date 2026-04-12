/**
 * 资源键位约定（浏览器里真·GIF 作为纹理每帧更新开销大，推荐把 GIF 转成「雪碧图 + json」或「图集」，
 * 用 this.anims.create + sprite.play('walk')。下面用同一套 key，你替换贴图即可。）
 *
 * 行走/站立：在 BasePlayer.update 里根据 |velocity| 切换 play('hero_walk') / play('hero_idle')
 * 武器外观：根据 skillSystem.weaponSlotOrder[0] 或「当前主武器」setTexture(WeaponTextureKey[w])
 */

export const CharacterTextureKey = {
  ranger: "tex_hero_ranger",
  melee: "tex_hero_melee",
  priest: "tex_hero_priest",
  mage: "tex_hero_mage",
  shieldbearer: "tex_hero_shield",
  yyxr: "tex_hero_yyxr"
}

/** 子弹默认用键；不同武器在发射处 setTexture */
export const BulletTextureKey = {
  default: "tex_bullet_default",
  trackingVolley: "tex_bullet_star",
  courageSong: "tex_bullet_wide",
  pixie: "tex_bullet_pixie",
  bossSpread: "tex_bullet_boss"
}

export const WeaponTextureKey = {
  arc: "tex_weapon_arc",
  trackingVolley: "tex_weapon_gun",
  laser: "tex_weapon_laser",
  groundZones: "tex_weapon_orb",
  shieldWeapon: "tex_weapon_shield",
  solarBurst: "tex_weapon_sun",
  blizzard: "tex_weapon_snow",
  hurricane: "tex_weapon_wind",
  courageSong: "tex_weapon_harp",
  pixie: "tex_weapon_fairy",
  blackHole: "tex_weapon_void"
}

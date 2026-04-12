import { CharacterTextureKey, BulletTextureKey, WeaponTextureKey } from "../data/assetKeys"

function makeTex(scene, key, w, h, fill, stroke) {
  if (scene.textures.exists(key)) return
  const g = scene.make.graphics({ x: 0, y: 0, add: false })
  g.fillStyle(fill, 1)
  g.fillRect(0, 0, w, h)
  if (stroke != null) {
    g.lineStyle(2, stroke, 1)
    g.strokeRect(1, 1, w - 2, h - 2)
  }
  g.generateTexture(key, w, h)
  g.destroy()
}

/**
 * 无外部 png/gif 时生成色块贴图，便于之后把同名 key 换成真实资源。
 */
export function ensurePlaceholderTextures(scene) {
  makeTex(scene, "bg_map", 512, 512, 0x152018, 0x2a3d2a)

  const chars = Object.values(CharacterTextureKey)
  const colors = [0x44aa66, 0xaa6644, 0x8888ee, 0xaa88ff, 0x6688cc, 0xffcc44]
  chars.forEach((key, i) => makeTex(scene, key, 48, 48, colors[i % colors.length], 0xffffff))

  makeTex(scene, BulletTextureKey.default, 12, 12, 0xffffee, 0x333333)
  makeTex(scene, BulletTextureKey.trackingVolley, 14, 14, 0xffee66, null)
  makeTex(scene, BulletTextureKey.courageSong, 32, 10, 0xaaddff, null)
  makeTex(scene, BulletTextureKey.pixie, 10, 10, 0x99ffaa, null)
  makeTex(scene, BulletTextureKey.bossSpread, 16, 16, 0xff4422, null)

  Object.values(WeaponTextureKey).forEach(k => makeTex(scene, k, 20, 20, 0x666677, 0xaaaaaa))

  makeTex(scene, "tex_pixie_companion", 18, 18, 0xccffcc, 0x339933)
}

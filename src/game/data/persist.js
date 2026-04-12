const GOLD_KEY = "nfo2_gold_v1"
const META_KEY = "nfo2_meta_upgrades_v1"

/** @returns {number} */
export function loadGold() {
  try {
    const v = localStorage.getItem(GOLD_KEY)
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0
  } catch {
    return 0
  }
}

export function saveGold(amount) {
  try {
    localStorage.setItem(GOLD_KEY, String(Math.max(0, Math.floor(amount))))
  } catch {
    /* ignore */
  }
}

/** @returns {Record<string, { hp: number, atk: number, def: number, spd: number }>} */
export function loadMetaUpgrades() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveMetaUpgrades(obj) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(obj))
  } catch {
    /* ignore */
  }
}

export function getMetaForCharacter(charId) {
  const all = loadMetaUpgrades()
  return all[charId] || { hp: 0, atk: 0, def: 0, spd: 0 }
}

export function setMetaForCharacter(charId, meta) {
  const all = loadMetaUpgrades()
  all[charId] = meta
  saveMetaUpgrades(all)
}

/**
 * 本地存储封装。页面禁止直接调 wx.setStorageSync，一律走这里。
 * 每个 key 都是整包读写：数据量在几百 KB 级别，整包最省心。
 */

const KEYS = {
  meta: 'dt_meta',           // { schemaVersion, firstLaunchAt, lastBackupAt }
  profile: 'dt_profile',     // 档案 + 目标 + 昵称头像 + 隐身
  daily: 'dt_daily',         // { 'YYYY-MM-DD': dailyRecord }
  points: 'dt_points',       // [{ date, module, points, serverAt, synced }]
  social: 'dt_social_cache', // { buddies, rankCache, lastSyncAt }
  queue: 'dt_sync_queue'     // 待上云的积分/资料变更
}

const SCHEMA_VERSION = 1

// Node 环境（tools/mock-check.js）下的内存兜底
const mem = {}
const hasWx = typeof wx !== 'undefined'

function read(key, fallback) {
  try {
    if (!hasWx) return key in mem ? mem[key] : fallback
    const v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    console.warn('[storage] read fail', key, e)
    return fallback
  }
}

function write(key, value) {
  try {
    if (!hasWx) { mem[key] = value; return true }
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.error('[storage] write fail', key, e)
    if (hasWx) {
      wx.showToast({ title: '保存失败，请到「我的」导出备份', icon: 'none', duration: 2600 })
    }
    return false
  }
}

function remove(key) {
  try {
    if (!hasWx) { delete mem[key]; return true }
    wx.removeStorageSync(key)
    return true
  } catch (e) {
    return false
  }
}

function getMeta() {
  return read(KEYS.meta, { schemaVersion: SCHEMA_VERSION, firstLaunchAt: 0, lastBackupAt: 0 })
}

function patchMeta(patch) {
  const m = Object.assign(getMeta(), patch)
  write(KEYS.meta, m)
  return m
}

/** 粗略估算本地占用（字节），用于「我的」页显示 */
function estimateBytes() {
  let total = 0
  Object.keys(KEYS).forEach(function (k) {
    const v = read(KEYS[k], null)
    if (v != null) total += JSON.stringify(v).length
  })
  return total
}

module.exports = { KEYS, SCHEMA_VERSION, read, write, remove, getMeta, patchMeta, estimateBytes }

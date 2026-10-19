/**
 * 备份与恢复。
 * 备份 = 导出 JSON 文件（转发给文件传输助手），失败降级为复制到剪贴板。
 * 恢复 = 校验通过后**完全替换**，不做合并；校验失败不动现有数据。
 */

const storage = require('./storage')
const config = require('../config')
const points = require('./points')

function buildPayload() {
  return {
    schemaVersion: storage.SCHEMA_VERSION,
    appVersion: config.version,
    exportedAt: Date.now(),
    profile: storage.read(storage.KEYS.profile, null),
    daily: storage.read(storage.KEYS.daily, {}),
    points: storage.read(storage.KEYS.points, []),
    meta: storage.getMeta()
  }
}

function stamp() {
  const d = new Date()
  const p = function (n) { return n < 10 ? '0' + n : '' + n }
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes())
}

/** 导出。返回 Promise<{ok, mode:'file'|'clipboard', path, name}> */
function exportBackup() {
  const payload = buildPayload()
  const text = JSON.stringify(payload)
  const name = 'dt-backup-' + stamp() + '.json'

  return new Promise(function (resolve) {
    let filePath = ''
    try {
      const fs = wx.getFileSystemManager()
      const dir = wx.env.USER_DATA_PATH + '/backup'
      try { fs.mkdirSync(dir, true) } catch (e) { /* 已存在 */ }
      filePath = dir + '/' + name
      fs.writeFileSync(filePath, text, 'utf8')
    } catch (e) {
      filePath = ''
    }

    storage.patchMeta({ lastBackupAt: Date.now() })

    if (filePath && wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath: filePath,
        fileName: name,
        success: function () { resolve({ ok: true, mode: 'file', path: filePath, name: name }) },
        fail: function () { clipboardFallback(text, name, resolve) }
      })
    } else {
      clipboardFallback(text, name, resolve)
    }
  })
}

function clipboardFallback(text, name, resolve) {
  wx.setClipboardData({
    data: text,
    success: function () { resolve({ ok: true, mode: 'clipboard', name: name }) },
    fail: function () { resolve({ ok: false, error: '导出失败，请重试' }) }
  })
}

/** 校验。返回 {ok:true, stats} 或 {ok:false, error} */
function validate(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: '不是有效的备份内容' }
  if (!obj.schemaVersion) return { ok: false, error: '缺少 schemaVersion，可能不是本应用的备份' }
  if (Number(obj.schemaVersion) > storage.SCHEMA_VERSION) {
    return { ok: false, error: '备份来自更新版本（v' + obj.schemaVersion + '），请先升级小程序' }
  }
  const p = obj.profile
  if (!p || typeof p !== 'object') return { ok: false, error: '备份里没有用户档案' }
  if (!p.sex || !p.age || !p.heightCm || !p.weightKg) {
    return { ok: false, error: '档案不完整，缺少性别/年龄/身高/体重' }
  }
  const daily = obj.daily || {}
  const keys = Object.keys(daily)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return { ok: false, error: '日期格式不对：' + k }
    const d = daily[k]
    if (!d || typeof d !== 'object') return { ok: false, error: k + ' 的记录不是对象' }
    if (d.water != null && isNaN(Number(d.water))) return { ok: false, error: k + ' 的饮水量不是数字' }
  }
  const pts = obj.points || []
  if (!Array.isArray(pts)) return { ok: false, error: 'points 不是数组' }
  for (let i = 0; i < pts.length; i++) {
    const e = pts[i]
    if (!e || !e.date || !e.module || !e.points) {
      return { ok: false, error: '第 ' + (i + 1) + ' 条积分记录缺少 date/module/points' }
    }
  }
  const totalPoints = pts.reduce(function (s, e) { return s + (Number(e.points) || 0) }, 0)
  return { ok: true, stats: { days: keys.length, points: totalPoints } }
}

/** 完全替换 */
function apply(obj) {
  const v = validate(obj)
  if (!v.ok) return v
  storage.write(storage.KEYS.profile, obj.profile)
  storage.write(storage.KEYS.daily, obj.daily || {})
  storage.write(storage.KEYS.points, obj.points || [])
  storage.write(storage.KEYS.queue, [])
  if (obj.meta && obj.meta.firstLaunchAt) storage.patchMeta({ firstLaunchAt: obj.meta.firstLaunchAt })
  points.markAllUnsynced()
  return { ok: true, stats: v.stats }
}

function clearAll() {
  Object.keys(storage.KEYS).forEach(function (k) { storage.remove(storage.KEYS[k]) })
}

module.exports = { buildPayload, exportBackup, validate, apply, clearAll }

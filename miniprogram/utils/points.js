/**
 * 积分账本。唯一键 date + module。
 * 当天记录改动会**实时结算**：达标发分，改回不达标则撤销该条（跨天不动历史）。
 * 撤销用墓碑方式：原条目置 points=0 + revoked=true + synced=false，
 * 联网时用 revoke 动作把云端那条也删掉，保证本地与榜单一致。
 */

const storage = require('./storage')
const config = require('../config')
const dateUtil = require('./date')
const daily = require('./daily')

const MODULES = ['water', 'anti', 'sleep', 'muscle']

function ledger() {
  const arr = storage.read(storage.KEYS.points, [])
  return Array.isArray(arr) ? arr : []
}

function save(arr) {
  storage.write(storage.KEYS.points, arr)
}

/** 只算还没被撤销的条目 */
function activeLedger() {
  return ledger().filter(function (e) { return !e.revoked })
}

function has(dateKey, module) {
  return activeLedger().some(function (e) { return e.date === dateKey && e.module === module })
}

function todayKey() {
  return dateUtil.dayKey()
}

/**
 * 尝试发分。
 * @returns {{awarded:boolean, points?:number, reason?:string}}
 */
function tryAward(dateKey, module, serverToday) {
  const today = serverToday || todayKey()
  if (dateKey !== today) return { awarded: false, reason: 'notToday' }   // 补记不给分
  if (has(dateKey, module)) return { awarded: false, reason: 'already' } // 幂等
  if (!daily.isDone(module, dateKey)) return { awarded: false, reason: 'notDone' }

  const arr = ledger()
  arr.push({
    date: dateKey,
    module: module,
    points: config.POINTS_PER_MODULE,
    serverAt: Date.now(),
    synced: false
  })
  save(arr)
  return { awarded: true, points: config.POINTS_PER_MODULE }
}

/**
 * 撤销某天某模块已发的分。改动不达标时调用。
 * @returns {boolean} 是否真的撤掉了一条
 */
function revoke(dateKey, module) {
  const arr = ledger()
  let hit = false
  arr.forEach(function (e) {
    if (!e.revoked && e.date === dateKey && e.module === module) {
      e.revoked = true
      e.points = 0
      e.synced = false          // 云端那条也要删，标成待同步
      e.revokedAt = Date.now()
      hit = true
    }
  })
  if (hit) save(arr)
  return hit
}

/**
 * 按当前记录重新结算今天：达标补发、不达标回收。
 * 只处理「今天」，历史日期一律不动（避免历史分被反复改写）。
 * @returns {{got:string[], lost:string[]}}
 */
function reconcile(dateKey, serverToday) {
  const today = serverToday || todayKey()
  if (dateKey !== today) return { got: [], lost: [] }

  const got = []
  const lost = []
  MODULES.forEach(function (m) {
    if (daily.isDone(m, dateKey)) {
      const r = tryAward(dateKey, m, today)
      if (r.awarded) got.push(m)
    } else if (revoke(dateKey, m)) {
      lost.push(m)
    }
  })
  return { got: got, lost: lost }
}

/** 兼容旧调用：只返回本轮新发的模块 key 数组（内部同样会回收） */
function awardAllIfDone(dateKey, serverToday) {
  return reconcile(dateKey, serverToday).got
}

function dayTotal(dateKey) {
  return ledger().reduce(function (s, e) {
    return e.date === dateKey ? s + (e.points || 0) : s
  }, 0)
}

/** 闭区间 [start, end] */
function rangeTotal(start, end) {
  return ledger().reduce(function (s, e) {
    return (e.date >= start && e.date <= end) ? s + (e.points || 0) : s
  }, 0)
}

function total() {
  return ledger().reduce(function (s, e) { return s + (e.points || 0) }, 0)
}

function todayMax() {
  return config.DAILY_MAX_POINTS
}

function pendingEntries() {
  return ledger().filter(function (e) { return !e.synced })
}

function pendingCount() {
  return pendingEntries().length
}

/** 上云成功后标记（按 date+module 定位） */
function markSynced(list) {
  if (!list || !list.length) return
  const arr = ledger()
  arr.forEach(function (e) {
    for (let i = 0; i < list.length; i++) {
      if (e.date === list[i].date && e.module === list[i].module) e.synced = true
    }
  })
  save(arr)
}

/** 恢复备份后：全部标记为未同步，联网重传 */
function markAllUnsynced() {
  const arr = ledger()
  arr.forEach(function (e) { e.synced = false })
  save(arr)
}

/** 近 n 天的每日得分（趋势用，升序） */
function scoreSeries(n, endDate) {
  const keys = dateUtil.lastNDays(n, endDate)
  const map = {}
  ledger().forEach(function (e) { map[e.date] = (map[e.date] || 0) + (e.points || 0) })
  return keys.map(function (k) { return { date: k, score: map[k] || 0 } })
}

module.exports = {
  ledger, activeLedger, has, tryAward, revoke, reconcile, awardAllIfDone,
  dayTotal, rangeTotal, total, todayMax,
  pendingEntries, pendingCount, markSynced, markAllUnsynced, scoreSeries
}

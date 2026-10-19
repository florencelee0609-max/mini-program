/**
 * 积分账本。与 daily 完全解耦：删记录不删分，分数只增不减。
 * 唯一键 date + module，重复调用不会重复发分。
 */

const storage = require('./storage')
const config = require('../config')
const dateUtil = require('./date')
const daily = require('./daily')

function ledger() {
  const arr = storage.read(storage.KEYS.points, [])
  return Array.isArray(arr) ? arr : []
}

function save(arr) {
  storage.write(storage.KEYS.points, arr)
}

function has(dateKey, module) {
  return ledger().some(function (e) { return e.date === dateKey && e.module === module })
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

/** 四个模块一起判定，返回本轮新发的模块 key 数组 */
function awardAllIfDone(dateKey, serverToday) {
  const got = []
  ;['water', 'anti', 'sleep', 'muscle'].forEach(function (m) {
    const r = tryAward(dateKey, m, serverToday)
    if (r.awarded) got.push(m)
  })
  return got
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
  ledger, has, tryAward, awardAllIfDone,
  dayTotal, rangeTotal, total, todayMax,
  pendingEntries, pendingCount, markSynced, markAllUnsynced, scoreSeries
}

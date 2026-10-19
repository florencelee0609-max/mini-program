/**
 * 每日记录：唯一真相。所有写入都走 patchDay，读不到返回默认对象且不落盘。
 */

const storage = require('./storage')
const config = require('../config')
const dateUtil = require('./date')
const constants = require('./constants')
const goals = require('./goals')

function blank() {
  return {
    water: 0,
    anti: { breakfast: [], lunch: [], dinner: [] },
    sleep: { bed: '', wake: '', durationMin: 0, quality: null },
    muscle: [],
    weightKg: null,
    calories: null,
    updatedAt: 0
  }
}

function all() {
  return storage.read(storage.KEYS.daily, {}) || {}
}

function getDay(dateKey) {
  const map = all()
  const d = map[dateKey]
  if (!d) return blank()
  // 兼容旧数据：缺字段补默认
  return {
    water: Number(d.water) || 0,
    anti: {
      breakfast: (d.anti && d.anti.breakfast) || [],
      lunch: (d.anti && d.anti.lunch) || [],
      dinner: (d.anti && d.anti.dinner) || []
    },
    sleep: Object.assign(blank().sleep, d.sleep || {}),
    muscle: Array.isArray(d.muscle) ? d.muscle : [],
    weightKg: d.weightKg == null ? null : Number(d.weightKg),
    calories: d.calories == null ? null : Number(d.calories),
    updatedAt: d.updatedAt || 0
  }
}

function hasDay(dateKey) {
  return !!all()[dateKey]
}

function patchDay(dateKey, patch) {
  const map = all()
  const next = Object.assign(getDay(dateKey), patch, { updatedAt: Date.now() })
  map[dateKey] = next
  storage.write(storage.KEYS.daily, map)
  return next
}

/** 直接设置升数（0–10，两位小数） */
function setWater(dateKey, liters) {
  let v = Math.round((Number(liters) || 0) * 100) / 100
  if (v < 0) v = 0
  if (v > 10) v = 10
  return patchDay(dateKey, { water: v })
}

// ---------------------------------------------------------------- 抗炎
function antiToggle(dateKey, meal, catKey) {
  const day = getDay(dateKey)
  const arr = (day.anti[meal] || []).slice()
  const i = arr.indexOf(catKey)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(catKey)
  const anti = Object.assign({}, day.anti)
  anti[meal] = arr
  return patchDay(dateKey, { anti: anti })
}

/** 三餐合并去重后的类别数（0–8） */
function antiCount(dateKey) {
  const day = getDay(dateKey)
  const set = {}
  ;['breakfast', 'lunch', 'dinner'].forEach(function (m) {
    (day.anti[m] || []).forEach(function (k) { set[k] = 1 })
  })
  return Object.keys(set).length
}

function antiPass(dateKey) {
  return antiCount(dateKey) >= config.ANTI_PASS_COUNT
}

// ---------------------------------------------------------------- 大睡
function setSleep(dateKey, patch) {
  const day = getDay(dateKey)
  const sleep = Object.assign({}, day.sleep, patch)
  if (sleep.bed && sleep.wake) {
    sleep.durationMin = dateUtil.durationMin(sleep.bed, sleep.wake)
  }
  return patchDay(dateKey, { sleep: sleep })
}

// ---------------------------------------------------------------- 薄肌
function muscleAdd(dateKey, item) {
  const day = getDay(dateKey)
  const list = day.muscle.slice()
  const rec = {
    id: 'm' + Date.now(),
    name: item.name,
    minutes: Number(item.minutes) || 0,
    intensity: item.intensity || 'mid',
    note: item.note || '',
    createdAt: Date.now()
  }
  if (item.sets && item.reps) { rec.sets = Number(item.sets); rec.reps = Number(item.reps) }
  list.push(rec)
  return patchDay(dateKey, { muscle: list })
}

function muscleRemove(dateKey, id) {
  const day = getDay(dateKey)
  return patchDay(dateKey, { muscle: day.muscle.filter(function (m) { return m.id !== id }) })
}

/** 本周训练次数（按"有记录的天数"算，一天练两次算一次） */
function getMuscleWeekCount(dateKey) {
  const range = dateUtil.weekRange(dateKey)
  const map = all()
  let n = 0
  Object.keys(map).forEach(function (k) {
    if (k >= range.start && k <= range.end && (map[k].muscle || []).length > 0) n++
  })
  return n
}

/** 本周训练总分钟 */
function getMuscleWeekMinutes(dateKey) {
  const range = dateUtil.weekRange(dateKey)
  const map = all()
  let n = 0
  Object.keys(map).forEach(function (k) {
    if (k >= range.start && k <= range.end) {
      (map[k].muscle || []).forEach(function (m) { n += Number(m.minutes) || 0 })
    }
  })
  return n
}

// ---------------------------------------------------------------- 判定
function isDone(module, dateKey) {
  const day = getDay(dateKey)
  if (module === 'water') return day.water >= goals.waterGoal() - 1e-9
  if (module === 'anti') return antiCount(dateKey) >= config.ANTI_PASS_COUNT
  if (module === 'sleep') return !!(day.sleep.bed && day.sleep.wake && day.sleep.quality)
  if (module === 'muscle') return day.muscle.length > 0
  return false
}

/** 趋势用：最近 n 天的聚合行（升序） */
function recentDays(n, endDate) {
  const keys = dateUtil.lastNDays(n, endDate)
  return keys.map(function (k) {
    const d = getDay(k)
    const sleepMin = d.sleep.durationMin || 0
    const muscleMin = d.muscle.reduce(function (s, m) { return s + (Number(m.minutes) || 0) }, 0)
    return {
      date: k,
      water: d.water,
      calories: d.calories,
      weightKg: d.weightKg,
      sleepMin: sleepMin,
      muscleMin: muscleMin,
      antiCount: antiCount(k),
      muscleDone: d.muscle.length > 0
    }
  })
}

/** 超过 KEEP_DAYS 的历史清理（在启动时调一次） */
function pruneOld() {
  const map = all()
  const cutoff = dateUtil.addDays(dateUtil.dayKey(), -config.KEEP_DAYS)
  let removed = 0
  Object.keys(map).forEach(function (k) {
    if (k < cutoff) { delete map[k]; removed++ }
  })
  if (removed) storage.write(storage.KEYS.daily, map)
  return removed
}

module.exports = {
  blank, all, getDay, hasDay, patchDay, setWater,
  antiToggle, antiCount, antiPass,
  setSleep, muscleAdd, muscleRemove, getMuscleWeekCount, getMuscleWeekMinutes,
  isDone, recentDays, pruneOld,
  MEALS: constants.MEALS
}

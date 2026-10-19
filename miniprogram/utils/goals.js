/**
 * 目标计算：PRD 5.2 的**唯一实现**。别在页面里复制公式。
 * 男：BMR = 10w + 6.25h - 5a + 5
 * 女：BMR = 10w + 6.25h - 5a - 161
 */

const config = require('../config')
const storage = require('./storage')

const ACTIVITY = {
  sedentary: { k: 1.2, label: '久坐' },
  light: { k: 1.375, label: '轻度' },
  moderate: { k: 1.55, label: '中度' },
  high: { k: 1.725, label: '高强度' }
}

const SHAPE = {
  leaner: { label: '偏瘦一点', kcalAdj: -300, strength: 3, cardio: 3 },
  keep: { label: '保持匀称', kcalAdj: 0, strength: 3, cardio: 2 },
  thinMuscle: { label: '薄肌有线条', kcalAdj: 0, strength: 3, cardio: 2 },
  muscular: { label: '明显肌肉', kcalAdj: 300, strength: 4, cardio: 2 }
}

/** 建议饮水（升）= 体重 × 32.5ml，四舍五入到 0.1，最低 1.5 */
function waterGoalFor(p) {
  const w = Number(p && p.weightKg) || 0
  if (!w) return config.WATER_MIN_L
  const l = Math.round(w * config.WATER_ML_PER_KG / 1000 * 10) / 10
  return Math.max(config.WATER_MIN_L, l)
}

/** 当前档案的饮水达标线。判定、进度、文案、计分全部用这一个值 */
function waterGoal() {
  const p = storage.read(storage.KEYS.profile, null)
  const t = p && p.targets
  if (t && Number(t.waterGoalL) > 0) return Math.round(t.waterGoalL * 10) / 10
  return waterGoalFor(p)
}

function calcTargets(p) {
  const sex = p && p.sex === 'female' ? 'female' : 'male'
  const w = Number(p && p.weightKg) || 0
  const h = Number(p && p.heightCm) || 0
  const a = Number(p && p.age) || 0
  const act = ACTIVITY[p && p.activity] || ACTIVITY.moderate
  const shape = SHAPE[p && p.bodyGoal] || SHAPE.keep

  const bmr = sex === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5

  const tdee = bmr * act.k
  const calories = Math.round((tdee + shape.kcalAdj) / 10) * 10
  const waterL = waterGoalFor({ weightKg: w })

  return {
    calories: calories,
    waterGoalL: waterL,                    // 达标线随体重走，判定与展示同一个值
    waterAdvancedL: waterL,                // 兼容旧字段
    strengthPerWeek: shape.strength,
    cardioPerWeek: shape.cardio,
    sleepText: '7–9 小时',
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  }
}

/** 手改过的字段不被档案变动覆盖 */
function mergeOverrides(calc, prevTargets, overridden) {
  const out = Object.assign({}, calc)
  const keys = overridden || []
  if (!prevTargets) return out
  keys.forEach(function (k) {
    if (prevTargets[k] !== undefined && k !== 'waterGoalL') out[k] = prevTargets[k]
  })
  return out
}

module.exports = { ACTIVITY, SHAPE, calcTargets, mergeOverrides, waterGoalFor, waterGoal }

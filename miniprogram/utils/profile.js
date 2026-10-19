/** 用户档案：读写、默认值、必填校验。 */

const storage = require('./storage')
const goals = require('./goals')

const NICKNAME_DEFAULT = '神秘大理论家'
const AVATARS = ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08']

const DEFAULT_PROFILE = {
  schemaVersion: 1,
  sex: '',                 // 'male' | 'female'
  age: 0,                  // 10-99
  heightCm: 0,             // 100-220
  weightKg: 0,             // 30-250
  activity: '',            // sedentary | light | moderate | high
  bodyGoal: '',            // leaner | keep | thinMuscle | muscular
  weightTargetKg: null,
  targets: null,           // goals.calcTargets 的结果
  overridden: [],          // 被手动改过的目标字段名
  nickname: '',
  avatarKey: 'a01',
  hideRank: false,
  customExercises: []
}

const FIELD_RULES = {
  age: { min: 10, max: 99, label: '年龄' },
  heightCm: { min: 100, max: 220, label: '身高' },
  weightKg: { min: 30, max: 250, label: '体重' }
}

function getProfile() {
  const p = storage.read(storage.KEYS.profile, null)
  if (!p) return null
  return Object.assign({}, DEFAULT_PROFILE, p)
}

function hasProfile() {
  const p = getProfile()
  return !!(p && p.sex && p.age && p.heightCm && p.weightKg && p.activity && p.bodyGoal)
}

/** 首次引导完成后调用：算目标 + 落盘 */
function saveProfile(patch) {
  const old = getProfile() || {}
  const merged = Object.assign({}, DEFAULT_PROFILE, old, patch)
  const calc = goals.calcTargets(merged)
  merged.targets = goals.mergeOverrides(calc, old.targets, merged.overridden)
  storage.write(storage.KEYS.profile, merged)
  return merged
}

/** 只改档案（可能触发重算），保留手改过的目标值 */
function updateBody(patch) {
  return saveProfile(patch)
}

/** 手改单个目标值 */
function overrideTarget(key, value) {
  const p = getProfile()
  if (!p) return null
  p.targets = Object.assign({}, p.targets)
  p.targets[key] = value
  if (p.overridden.indexOf(key) < 0) p.overridden.push(key)
  storage.write(storage.KEYS.profile, p)
  return p
}

function resetTargets() {
  const p = getProfile()
  if (!p) return null
  p.overridden = []
  p.targets = goals.calcTargets(p)
  storage.write(storage.KEYS.profile, p)
  return p
}

function displayName(p) {
  const x = p || getProfile()
  return (x && x.nickname && x.nickname.trim()) || NICKNAME_DEFAULT
}

/** 自定义训练项目（持久化在 profile 里） */
function getCustomExercises() {
  const p = getProfile()
  return (p && p.customExercises) || []
}

function addCustomExercise(name, sets, reps) {
  const n = String(name || '').trim().slice(0, 12)
  if (!n) return getCustomExercises()
  const p = getProfile()
  if (!p) return []
  const s = Math.min(20, Math.max(1, Math.round(Number(sets) || 3)))
  const r = Math.min(100, Math.max(1, Math.round(Number(reps) || 12)))
  const list = (p.customExercises || []).slice()
  const i = list.findIndex(function (x) { return x.name === n })
  const item = { name: n, sets: s, reps: r, tip: s + ' 组 × ' + r + ' 次' }
  if (i >= 0) list[i] = item
  else list.push(item)
  p.customExercises = list
  storage.write(storage.KEYS.profile, p)
  return list
}

/** 单字段校验，返回 '' 表示通过 */
function checkField(key, value) {
  const rule = FIELD_RULES[key]
  if (!rule) return ''
  const n = Number(value)
  if (!n || isNaN(n)) return '请填写' + rule.label
  if (n < rule.min || n > rule.max) {
    return rule.label + '需在 ' + rule.min + '–' + rule.max + ' 之间'
  }
  return ''
}

/** 引导页整体校验 */
function validate(p) {
  if (!p.sex) return { ok: false, field: 'sex', msg: '请选择性别' }
  const e1 = checkField('age', p.age)
  if (e1) return { ok: false, field: 'age', msg: e1 }
  const e2 = checkField('heightCm', p.heightCm)
  if (e2) return { ok: false, field: 'heightCm', msg: e2 }
  const e3 = checkField('weightKg', p.weightKg)
  if (e3) return { ok: false, field: 'weightKg', msg: e3 }
  if (!p.activity) return { ok: false, field: 'activity', msg: '请选择日常活动量' }
  return { ok: true }
}

module.exports = {
  NICKNAME_DEFAULT, AVATARS, DEFAULT_PROFILE,
  getProfile, hasProfile, saveProfile, updateBody, overrideTarget, resetTargets,
  displayName, checkField, validate,
  getCustomExercises, addCustomExercise
}

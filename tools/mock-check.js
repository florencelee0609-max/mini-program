/**
 * 数据层自测（Node 直接跑，不需要小程序环境）：
 *   node tools/mock-check.js
 * 用内存兜底替代 wx.storage，覆盖 PRD 里最容易算错的几条。
 */
const path = require('path')
const root = path.join(__dirname, '..', 'miniprogram', 'utils')

const dateUtil = require(path.join(root, 'date.js'))
const goals = require(path.join(root, 'goals.js'))
const daily = require(path.join(root, 'daily.js'))
const points = require(path.join(root, 'points.js'))
const storage = require(path.join(root, 'storage.js'))

let pass = 0, fail = 0
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + JSON.stringify(extra) : '')) }
}

const today = dateUtil.dayKey()
const yest = dateUtil.addDays(today, -1)

console.log('\n[A] 目标计算')
const t = goals.calcTargets({ sex: 'male', age: 30, heightCm: 175, weightKg: 68, activity: 'moderate', bodyGoal: 'keep' })
ok('男 30/175/68 中度 热量 = 2520', t.calories === 2520, t.calories)
ok('饮水目标 = 体重 × 32.5ml = 2.2', t.waterGoalL === 2.2, t.waterGoalL)
ok('55kg → 1.8 升', goals.waterGoalFor({ weightKg: 55 }) === 1.8, goals.waterGoalFor({ weightKg: 55 }))
ok('极轻体重兜底 1.5 升', goals.waterGoalFor({ weightKg: 40 }) === 1.5, goals.waterGoalFor({ weightKg: 40 }))
storage.write(storage.KEYS.profile, { weightKg: 68, targets: t })
ok('判定读取同一个目标值 2.2', goals.waterGoal() === 2.2, goals.waterGoal())
ok('运动建议 3 力量 + 2 有氧', t.strengthPerWeek === 3 && t.cardioPerWeek === 2, [t.strengthPerWeek, t.cardioPerWeek])
const t2 = goals.calcTargets({ sex: 'female', age: 28, heightCm: 165, weightKg: 55, activity: 'light', bodyGoal: 'leaner' })
ok('女 leaner 热量低于 bmr*k（=tdEE-300）', t2.calories === Math.round((t2.tdee - 300) / 10) * 10, [t2.calories, t2.tdee])

console.log('\n[B] 睡眠跨零点')
ok('23:40 → 07:10 = 450 分', dateUtil.durationMin('23:40', '07:10') === 450, dateUtil.durationMin('23:40', '07:10'))
ok('01:00 → 08:00 = 420 分', dateUtil.durationMin('01:00', '08:00') === 420)
ok('7时30分 文案', dateUtil.fmtDuration(450) === '7时30分', dateUtil.fmtDuration(450))

console.log('\n[C] 抗炎去重')
daily.patchDay(today, daily.blank())
daily.antiToggle(today, 'breakfast', 'leafy')
daily.antiToggle(today, 'dinner', 'leafy')
daily.antiToggle(today, 'lunch', 'berry')
ok('绿叶出现两次只算 1 类', daily.antiCount(today) === 2, daily.antiCount(today))
daily.antiToggle(today, 'lunch', 'fish')
ok('三类即合格', daily.antiPass(today) === true, daily.antiCount(today))
daily.antiToggle(today, 'lunch', 'fish')
ok('取消一项后回到 2 类', daily.antiCount(today) === 2, daily.antiCount(today))

console.log('\n[D] 积分幂等与不回收')
ok('抗炎不合格不给分', points.tryAward(today, 'anti', today).awarded === false)
daily.setWater(today, 1.5)
ok('1.5 升不再算达标（目标 2.2）', points.tryAward(today, 'water', today).awarded === false)
daily.setWater(today, 2.2)
ok('喝到 2.2 升才给 10 分', points.tryAward(today, 'water', today).awarded === true)
ok('同一模块再发不给', points.tryAward(today, 'water', today).reason === 'already')
daily.setWater(today, 0.4)
ok('删到 0.4 升后分数仍在', points.dayTotal(today) === 10, points.dayTotal(today))
ok('补记旧日期不给分', points.tryAward(yest, 'water', today).reason === 'notToday')

console.log('\n[D2] 大睡得分线（≥7 小时，质量不参与）')
daily.setSleep(today, { bed: '23:00', wake: '05:59', quality: 'good' })
ok('6时59分 + 自评优 → 不算完成',
  daily.isDone('sleep', today) === false, daily.getDay(today).sleep.durationMin)
daily.setSleep(today, { wake: '06:00' })
ok('正好 7 小时 → 完成（边界含等于）',
  daily.isDone('sleep', today) === true, daily.getDay(today).sleep.durationMin)
daily.setSleep(today, { quality: null })
ok('不填自评也算完成', daily.isDone('sleep', today) === true)
ok('满 7 小时给 10 分', points.tryAward(today, 'sleep', today).awarded === true)
daily.setSleep(today, { wake: '05:59' })
ok('先给分后改到 6时59分，分数不回收（20 分）',
  points.dayTotal(today) === 20, points.dayTotal(today))

console.log('\n[E] 默认值与不落盘')
const anyDay = dateUtil.addDays(today, -40)
ok('缺失日期返回默认对象', daily.getDay(anyDay).water === 0)
ok('读默认对象不写盘', daily.hasDay(anyDay) === false)

console.log('\n[F] 周次数')
daily.muscleAdd(today, { name: '深蹲', minutes: 40, intensity: 'mid' })
ok('本周 1 次', daily.getMuscleWeekCount(today) === 1, daily.getMuscleWeekCount(today))
daily.muscleAdd(today, { name: '卧推', minutes: 30, intensity: 'hard' })
ok('同一天两次仍算 1 次', daily.getMuscleWeekCount(today) === 1, daily.getMuscleWeekCount(today))
ok('本周总分钟 70', daily.getMuscleWeekMinutes(today) === 70, daily.getMuscleWeekMinutes(today))
daily.muscleAdd(today, { name: '壶铃摇摆', minutes: 20, intensity: 'mid', sets: 4, reps: 15 })
const rec = daily.getDay(today).muscle.filter(function (m) { return m.name === '壶铃摇摆' })[0]
ok('自定义动作存下 4 组 × 15 次', rec && rec.sets === 4 && rec.reps === 15, rec)

console.log('\n[G] 趋势聚合')
const rows = daily.recentDays(7, today)
ok('返回 7 行且升序', rows.length === 7 && rows[6].date === today, rows.length)

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败\n')
process.exit(fail ? 1 : 0)

/** 日期与时长工具。全部按本地时区做"展示"，是否"今天"由服务器日期判定。 */

function pad(n) { return n < 10 ? '0' + n : '' + n }

/** Date → 'YYYY-MM-DD' */
function dayKey(d) {
  const x = d || new Date()
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate())
}

/** 'YYYY-MM-DD' → Date（当天 00:00 本地） */
function fromKey(k) {
  const p = String(k).split('-').map(Number)
  return new Date(p[0], p[1] - 1, p[2])
}

function addDays(k, n) {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** 周一为一周开始 */
function weekStart(k) {
  const d = fromKey(k || dayKey())
  const wd = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - wd)
  return dayKey(d)
}

function weekRange(k) {
  const s = weekStart(k || dayKey())
  return { start: s, end: addDays(s, 6) }
}

/** 升序数组，最后一个是 endDate */
function lastNDays(n, endDate) {
  const end = endDate || dayKey()
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

function toMin(hm) {
  if (!hm || typeof hm !== 'string') return 0
  const p = hm.split(':')
  return Number(p[0]) * 60 + Number(p[1] || 0)
}

/** 入睡/起床 → 分钟数，自动处理跨零点（23:40→07:10 = 450） */
function durationMin(bed, wake) {
  if (!bed || !wake) return 0
  let d = toMin(wake) - toMin(bed)
  if (d <= 0) d += 1440
  return d
}

/** 450 → '7时30分'；0 → '--' */
function fmtDuration(min) {
  if (!min || min <= 0) return '--'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return m + '分'
  return h + '时' + (m ? m + '分' : '')
}

function nowHM() {
  const d = new Date()
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** 第 N 天（含首日） */
function dayIndex(firstLaunchAt) {
  if (!firstLaunchAt) return 1
  const a = new Date(firstLaunchAt)
  const s = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const n = new Date()
  const t = new Date(n.getFullYear(), n.getMonth(), n.getDate())
  return Math.max(1, Math.round((t - s) / 86400000) + 1)
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** '2026-10-19' → '10月19日 周一'（今天显示"今天"） */
function fmtDayLabel(k) {
  const d = fromKey(k)
  const md = (d.getMonth() + 1) + '月' + d.getDate() + '日'
  const wd = WEEK[d.getDay()]
  if (k === dayKey()) return '今天 · ' + md
  return md + ' ' + wd
}

module.exports = {
  pad, dayKey, fromKey, addDays, weekStart, weekRange, lastNDays,
  toMin, durationMin, fmtDuration, nowHM, dayIndex, fmtDayLabel
}

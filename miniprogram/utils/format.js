/** 显示格式。所有饮水数字都只以「升」出现，任何地方不要拼出毫升。 */

function round(n, d) {
  const f = Math.pow(10, d == null ? 2 : d)
  return Math.round(n * f) / f
}

/** 1.2 / 1.25 / 1.5 → '1.2' '1.25' '1.5'（去掉无意义的 0） */
function liters(n) {
  const v = round(n || 0, 2)
  return String(v)
}

/** 不足 1 升时补 0：0.75 → '0.75'，0 → '0' */
function litersFixed(n) {
  const v = round(n || 0, 2)
  return v.toFixed(2).replace(/0$/, '')
}

function kcal(n) {
  if (n == null || n === '') return '--'
  return String(Math.round(n))
}

function weight(n) {
  if (n == null || n === '') return '--'
  return round(n, 1).toFixed(1)
}

/** 秒级时间戳 → '10月19日 23:10' */
function backupTime(ts) {
  if (!ts) return '从未备份'
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
    (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
    (d.getMinutes() < 10 ? '0' : '') + d.getMinutes()
}

module.exports = { round, liters, litersFixed, kcal, weight, backupTime }

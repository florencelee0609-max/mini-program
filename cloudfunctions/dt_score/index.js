const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const TZ_OFFSET = 8 * 60 * 60 * 1000

function serverDayKey(offsetDays) {
  const d = new Date(Date.now() + TZ_OFFSET + (offsetDays || 0) * 86400000)
  const p = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
}

function isDup(e) {
  const msg = (e && (e.errMsg || e.message || '')) + ''
  return /duplicate|E11000|-502001/i.test(msg)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const today = serverDayKey()

  if (event.action === 'ping') {
    return { ok: true, serverToday: today }
  }

  const mods = ['water', 'anti', 'sleep', 'muscle']

  // 撤销：用户把当天记录改成不达标，本地已扣分，这条要把云端那条也删掉
  if (event.action === 'revoke') {
    if (!event.date || mods.indexOf(event.module) < 0) {
      return { ok: false, code: 'BAD_PARAM', serverToday: today }
    }
    // 只允许撤销今天或昨天：离线时队列可能跨过零点才推上来
    if ([today, serverDayKey(-1)].indexOf(event.date) < 0) {
      return { ok: false, code: 'NOT_RECENT', serverToday: today }
    }
    try {
      const r = await db.collection('dt_scores')
        .where({ _openid: OPENID, date: event.date, module: event.module })
        .remove()
      const removed = (r && r.stats && r.stats.removed) || 0
      return { ok: true, removed: removed, code: removed ? 'REVOKED' : 'NOT_FOUND', serverToday: today }
    } catch (e) {
      return { ok: false, code: 'DB_ERROR', msg: String(e && e.errMsg || e), serverToday: today }
    }
  }

  if (event.action !== 'submit') {
    return { ok: false, code: 'BAD_ACTION', serverToday: today }
  }

  // 铁律 4：跨天判定用服务器时间，补记和改手机日期都进不来
  if (!event.date || event.date !== today) {
    return { ok: false, code: 'NOT_TODAY', serverToday: today }
  }
  if (mods.indexOf(event.module) < 0) {
    return { ok: false, code: 'BAD_MODULE', serverToday: today }
  }

  try {
    await db.collection('dt_scores').add({
      data: {
        _openid: OPENID,
        date: event.date,
        module: event.module,
        points: 10,
        serverAt: Date.now()
      }
    })
    return { ok: true, awarded: true, serverToday: today }
  } catch (e) {
    // 唯一索引兜底：已发过就当作成功（幂等）
    if (isDup(e)) return { ok: true, awarded: false, code: 'DUPLICATE', serverToday: today }
    return { ok: false, code: 'DB_ERROR', msg: String(e && e.errMsg || e), serverToday: today }
  }
}

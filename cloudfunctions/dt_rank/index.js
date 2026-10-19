const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

const TZ_OFFSET = 8 * 60 * 60 * 1000

function dayKey(ts) {
  const d = new Date((ts || Date.now()) + TZ_OFFSET)
  const p = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
}

function weekStartKey() {
  const d = new Date(Date.now() + TZ_OFFSET)
  const wd = (d.getUTCDay() + 6) % 7        // 周一 = 0
  const start = new Date(d.getTime() - wd * 86400000)
  const p = function (n) { return n < 10 ? '0' + n : '' + n }
  return start.getUTCFullYear() + '-' + p(start.getUTCMonth() + 1) + '-' + p(start.getUTCDate())
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: '没有身份信息' }

  const period = event.period || 'total'
  let start = null
  if (period === 'today') start = dayKey()
  if (period === 'week') start = weekStartKey()

  // 我 + 搭子
  const mine = await db.collection('dt_buddies').where({ _openid: OPENID }).limit(20).get()
  const ids = [OPENID].concat((mine.data || []).map(function (x) { return x.buddyOpenid }))

  const match = { _openid: _.in(ids) }
  if (start) match.date = _.gte(start)

  const agg = await db.collection('dt_scores').aggregate()
    .match(match)
    .group({ _id: '$_openid', total: $.sum('$points'), firstAt: $.min('$serverAt') })
    .end()

  const scoreMap = {}
  ;(agg.list || []).forEach(function (row) {
    scoreMap[row._id] = { total: row.total || 0, firstAt: row.firstAt || 0 }
  })

  const users = await db.collection('dt_users').where({ _openid: _.in(ids) }).get()
  const userMap = {}
  ;(users.data || []).forEach(function (u) { userMap[u._openid] = u })

  const list = ids.map(function (id) {
    const u = userMap[id] || {}
    const s = scoreMap[id] || { total: 0, firstAt: Number.MAX_SAFE_INTEGER }
    return {
      openid: id,
      nickname: u.nickname || '神秘大理论家',
      avatarKey: u.avatarKey || 'a01',
      hideRank: !!u.hideRank,
      score: s.total,
      firstAt: s.total > 0 ? s.firstAt : Number.MAX_SAFE_INTEGER,
      isMe: id === OPENID
    }
  })

  // 分高者先；同分时，先达到这个分数的人先
  list.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score
    return a.firstAt - b.firstAt
  })
  list.forEach(function (x, i) { x.rank = i + 1 })

  return { ok: true, period: period, list: list, limit: 20 }
}

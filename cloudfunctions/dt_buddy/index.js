const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const LIMIT = 20
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const WEEK = 7 * 24 * 3600 * 1000

function makeCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

async function buddyCount(openid) {
  const r = await db.collection('dt_buddies').where({ _openid: openid }).count()
  return r.total || 0
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: '没有身份信息' }
  const action = event.action

  if (action === 'createInvite') {
    if (await buddyCount(OPENID) >= LIMIT) {
      return { ok: false, msg: '最多 20 位搭子' }
    }
    let code = makeCode()
    // 极小概率撞码，重试三次
    for (let i = 0; i < 3; i++) {
      const dup = await db.collection('dt_invites').where({ code: code, usedBy: null }).count()
      if (!dup.total) break
      code = makeCode()
    }
    await db.collection('dt_invites').add({
      data: {
        code: code,
        ownerOpenid: OPENID,
        expireAt: Date.now() + WEEK,
        usedBy: null,
        createdAt: Date.now()
      }
    })
    return { ok: true, code: code, expireAt: Date.now() + WEEK }
  }

  if (action === 'accept') {
    const code = String(event.code || '').toUpperCase().trim()
    if (code.length !== 6) return { ok: false, msg: '邀请码是 6 位' }
    const found = await db.collection('dt_invites').where({ code: code }).limit(1).get()
    const inv = found.data && found.data[0]
    if (!inv) return { ok: false, msg: '邀请码不存在' }
    if (inv.usedBy) return { ok: false, msg: '邀请码已经用过了' }
    if (inv.expireAt < Date.now()) return { ok: false, msg: '邀请码已过期' }
    const owner = inv.ownerOpenid
    if (owner === OPENID) return { ok: false, msg: '不能加自己' }

    if (await buddyCount(OPENID) >= LIMIT) return { ok: false, msg: '你的搭子已满 20 位' }
    if (await buddyCount(owner) >= LIMIT) return { ok: false, msg: '对方的搭子已满 20 位' }

    const exists = await db.collection('dt_buddies')
      .where({ _openid: OPENID, buddyOpenid: owner }).count()
    if (exists.total) return { ok: true, msg: '已经是搭子了' }

    await db.collection('dt_buddies').add({
      data: { _openid: OPENID, buddyOpenid: owner, createdAt: Date.now() }
    })
    await db.collection('dt_buddies').add({
      data: { _openid: owner, buddyOpenid: OPENID, createdAt: Date.now() }
    })
    await db.collection('dt_invites').doc(inv._id).update({
      data: { usedBy: OPENID, usedAt: Date.now() }
    })
    return { ok: true }
  }

  if (action === 'list') {
    const mine = await db.collection('dt_buddies').where({ _openid: OPENID }).limit(LIMIT).get()
    const ids = (mine.data || []).map(function (x) { return x.buddyOpenid })
    if (!ids.length) return { ok: true, list: [], limit: LIMIT }

    const users = await db.collection('dt_users').where({ _openid: _.in(ids) }).get()
    const map = {}
    ;(users.data || []).forEach(function (u) { map[u._openid] = u })
    const list = ids.map(function (id) {
      const u = map[id] || {}
      return {
        openid: id,
        nickname: u.nickname || '神秘大理论家',
        avatarKey: u.avatarKey || 'a01',
        hideRank: !!u.hideRank
      }
    })
    return { ok: true, list: list, limit: LIMIT }
  }

  if (action === 'remove') {
    const target = event.buddyOpenid
    if (!target) return { ok: false, msg: '缺少参数' }
    await db.collection('dt_buddies').where({ _openid: OPENID, buddyOpenid: target }).remove()
    await db.collection('dt_buddies').where({ _openid: target, buddyOpenid: OPENID }).remove()
    return { ok: true }
  }

  return { ok: false, msg: '未知操作' }
}

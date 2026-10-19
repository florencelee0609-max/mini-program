const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: '没有身份信息' }

  const data = {
    nickname: String(event.nickname || '').slice(0, 12),
    avatarKey: String(event.avatarKey || 'a01').slice(0, 8),
    hideRank: !!event.hideRank,
    updatedAt: Date.now()
  }

  const col = db.collection('dt_users')
  const found = await col.where({ _openid: OPENID }).limit(1).get()
  if (found.data && found.data.length) {
    await col.doc(found.data[0]._id).update({ data: data })
  } else {
    await col.add({ data: Object.assign({ _openid: OPENID }, data) })
  }
  return { ok: true }
}

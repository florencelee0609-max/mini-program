/**
 * 云开发封装。没配环境 ID 或初始化失败时，全部走"本地降级"：
 * 积分只存本地，榜单显示单机状态。绝不抛错阻断主流程。
 */

const config = require('../config')
const points = require('./points')
const dateUtil = require('./date')

let todayCache = { value: '', at: 0 }

function ready() {
  try {
    const app = getApp()
    return !!(config.cloudEnvId && wx.cloud && app && app.globalData.cloudReady)
  } catch (e) {
    return false
  }
}

function call(name, data) {
  return new Promise(function (resolve, reject) {
    if (!ready()) { reject(new Error('CLOUD_OFF')); return }
    wx.cloud.callFunction({
      name: name,
      data: data || {},
      success: function (res) { resolve((res && res.result) || {}) },
      fail: function (err) { reject(err) }
    })
  })
}

/** 服务器当天（YYYY-MM-DD）。缓存 10 分钟，拿不到就用本地日期兜底。 */
function serverToday() {
  const now = Date.now()
  if (todayCache.value && now - todayCache.at < 600000) return Promise.resolve(todayCache.value)
  if (!ready()) {
    const v = dateUtil.dayKey()
    todayCache = { value: v, at: now }
    return Promise.resolve(v)
  }
  return call('dt_score', { action: 'ping' }).then(function (r) {
    const v = (r && r.serverToday) || dateUtil.dayKey()
    todayCache = { value: v, at: now }
    return v
  }).catch(function () {
    const v = dateUtil.dayKey()
    todayCache = { value: v, at: now }
    return v
  })
}

/** 把本地未同步的积分推到云端；遇到错误就停（视为离线） */
function pushPendingScores() {
  if (!ready()) return Promise.resolve({ pushed: 0, offline: true })
  const list = points.pendingEntries()
  if (!list.length) return Promise.resolve({ pushed: 0 })

  const done = []
  let i = 0
  function step() {
    if (i >= list.length) {
      points.markSynced(done)
      return Promise.resolve({ pushed: done.length })
    }
    const e = list[i++]
    return call('dt_score', { action: 'submit', date: e.date, module: e.module })
      .then(function (r) {
        if (r && (r.ok || r.code === 'DUPLICATE')) done.push(e)
        return step()
      })
      .catch(function () {
        points.markSynced(done)
        return { pushed: done.length, offline: true }
      })
  }
  return step()
}

/** 昵称 / 头像 / 隐身 同步（不阻塞 UI） */
function pushProfile(p) {
  if (!ready() || !p) return Promise.resolve(false)
  return call('dt_profile', {
    action: 'upsert',
    nickname: p.nickname || '',
    avatarKey: p.avatarKey || 'a01',
    hideRank: !!p.hideRank
  }).then(function () { return true }).catch(function () { return false })
}

// ---------------------------------------------------------------- 搭子
function createInvite() {
  return call('dt_buddy', { action: 'createInvite' })
}
function acceptInvite(code) {
  return call('dt_buddy', { action: 'accept', code: code })
}
function listBuddies() {
  return call('dt_buddy', { action: 'list' })
}
function removeBuddy(openid) {
  return call('dt_buddy', { action: 'remove', buddyOpenid: openid })
}

// ---------------------------------------------------------------- 榜单
function getRank(period) {
  return call('dt_rank', { action: 'get', period: period || 'total' })
}

module.exports = {
  ready, call, serverToday, pushPendingScores, pushProfile,
  createInvite, acceptInvite, listBuddies, removeBuddy, getRank
}

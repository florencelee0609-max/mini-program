const profile = require('../../utils/profile')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const config = require('../../config')

Page({
  data: {
    period: 'total',
    cloudOn: false,
    loading: false,
    list: [],
    me: null,
    limit: config.BUDDY_LIMIT,
    inviteCode: '',
    showInvite: false,
    codeInput: ''
  },

  onShow: function () {
    const tb = this.getTabBar && this.getTabBar()
    if (tb) tb.setData({ selected: 2 })
    this.setData({ cloudOn: cloud.ready() })
    this.load()
  },

  onPeriod: function (e) {
    this.setData({ period: e.currentTarget.dataset.p })
    this.load()
  },

  load: function () {
    const p = profile.getProfile()
    const today = dateUtil.dayKey()
    let score = 0
    let rangeText = ''
    if (this.data.period === 'today') {
      score = points.dayTotal(today)
      rangeText = '今日'
    } else if (this.data.period === 'week') {
      const w = dateUtil.weekRange(today)
      score = points.rangeTotal(w.start, w.end)
      rangeText = '本周'
    } else {
      score = points.total()
      rangeText = '累计'
    }

    const me = {
      id: 'me',
      nickname: profile.displayName(p),
      avatarKey: (p && p.avatarKey) || 'a01',
      score: score,
      rank: 1,
      isMe: true
    }

    if (!cloud.ready()) {
      this.setData({ me: me, list: [me], loading: false, rangeText: rangeText })
      return
    }

    this.setData({ loading: true, me: me })
    const self = this
    cloud.getRank(this.data.period).then(function (res) {
      const list = (res && res.list) || []
      list.forEach(function (x) { if (!x.id) x.id = x.openid || ('b' + Math.random()) })
      const mine = list.filter(function (x) { return x.isMe })[0] || me
      self.setData({ list: list.length ? list : [me], me: mine, loading: false, rangeText: rangeText })
    }).catch(function () {
      self.setData({ list: [me], loading: false, rangeText: rangeText })
    })
  },

  onInvite: function () {
    if (!cloud.ready()) {
      wx.showModal({
        title: '还没接上云端',
        content: '榜单需要一个双方都能读的地方。请在 config.js 填入云开发环境 ID，并部署 cloudfunctions 里的四个云函数。',
        showCancel: false
      })
      return
    }
    const self = this
    cloud.createInvite().then(function (r) {
      if (r && r.code) {
        self.setData({ inviteCode: r.code, showInvite: true })
      } else {
        wx.showToast({ title: (r && r.msg) || '生成失败', icon: 'none' })
      }
    }).catch(function () {
      wx.showToast({ title: '网络不可用', icon: 'none' })
    })
  },

  onCloseInvite: function () {
    this.setData({ showInvite: false })
  },

  onCode: function (e) {
    this.setData({ codeInput: e.detail.value })
  },

  onAcceptCode: function () {
    const code = (this.data.codeInput || '').trim().toUpperCase()
    if (code.length !== 6) {
      wx.showToast({ title: '邀请码是 6 位', icon: 'none' })
      return
    }
    cloud.acceptInvite(code).then(function (r) {
      if (r && r.ok) {
        wx.showToast({ title: '已接受', icon: 'none' })
      } else {
        wx.showToast({ title: (r && r.msg) || '邀请已失效', icon: 'none' })
      }
    }).catch(function () {
      wx.showToast({ title: '网络不可用', icon: 'none' })
    })
  },

  onBuddies: function () {
    wx.navigateTo({ url: '/pages/me/index' })
  },

  onShareAppMessage: function () {
    const code = this.data.inviteCode
    return {
      title: '全民严肃进入大理论时代',
      path: '/pages/splash/index' + (code ? ('?inviteCode=' + code) : '')
    }
  },

  // 键盘高度：input 聚焦时把键盘高度传给 px-sheet，让弹层整体抬到键盘上方。
  // 用 e.detail.height（基础库 1.0 起就有），比 wx.onKeyboardHeightChange 稳定 ——
  // 后者在真机上曾返回异常值，把弹层直接顶出屏幕。
  onKbFocus: function (e) {
    const d = (e && e.detail) || {}
    const h = Number(d.height)
    this.setData({ kb: isNaN(h) || h < 0 ? 0 : h })
  },

  onKbBlur: function () {
    this.setData({ kb: 0 })
  }
})

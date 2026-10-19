const app = getApp()
const config = require('../../config')
const daily = require('../../utils/daily')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const fmt = require('../../utils/format')
const profile = require('../../utils/profile')
const goals = require('../../utils/goals')

Page({
  data: {
    slogan: config.waterSlogan,
    dateKey: '',
    isHistory: false,
    dateLabel: '',
    water: 0,
    goal: config.WATER_MIN_L,
    pct: 0,
    diff: config.WATER_MIN_L,
    done: false,
    formulaText: '',
    pop: false,
    showSheet: false,
    tmp: ''
  },

  onLoad: function (q) {
    const today = dateUtil.dayKey()
    const dateKey = (q && q.date) || today
    const p = profile.getProfile()
    const goal = goals.waterGoal()
    const w = (p && p.weightKg) || 0
    this.setData({ formulaText: w ? (w + ' 公斤 × 32.5 毫升 = ' + goal + ' 升') : ('喝到 ' + goal + ' 升达标') })
    this.stack = []
    this.setData({
      dateKey: dateKey,
      isHistory: dateKey !== today,
      dateLabel: dateUtil.fmtDayLabel(dateKey),
      goal: goal
    })
    this.load()
  },

  load: function () {
    const d = daily.getDay(this.data.dateKey)
    const goal = this.data.goal
    const pct = Math.min(100, Math.round(d.water / goal * 100))
    this.setData({
      water: d.water,
      pct: pct,
      diff: Math.max(0, Math.round((goal - d.water) * 100) / 100),
      done: d.water >= goal
    })
  },

  onStep: function (e) {
    const add = Number(e.currentTarget.dataset.v)
    this.stack.push(this.data.water)
    daily.setWater(this.data.dateKey, this.data.water + add)
    this.load()
    this.award()
  },

  onUndo: function () {
    if (!this.stack.length) {
      wx.showToast({ title: '没有可撤销的操作', icon: 'none' })
      return
    }
    const prev = this.stack.pop()
    daily.setWater(this.data.dateKey, prev)
    this.load()
  },

  onOpenSheet: function () {
    this.setData({ showSheet: true, tmp: String(this.data.water || '') })
  },

  onCloseSheet: function () {
    this.setData({ showSheet: false })
  },

  onTmp: function (e) {
    this.setData({ tmp: e.detail.value })
  },

  onSaveTotal: function () {
    const v = Number(this.data.tmp)
    if (isNaN(v) || v < 0) {
      wx.showToast({ title: '填个数字', icon: 'none' })
      return
    }
    if (v > 10) wx.showToast({ title: '一天 10 升封顶', icon: 'none' })
    this.stack.push(this.data.water)
    daily.setWater(this.data.dateKey, v)
    this.setData({ showSheet: false })
    this.load()
    this.award()
  },

  award: function () {
    if (this.data.isHistory) return          // 补记不给分
    const got = points.awardAllIfDone(this.data.dateKey, dateUtil.dayKey())
    if (got.indexOf('water') >= 0) {
      this.setData({ pop: true })
      const self = this
      setTimeout(function () { self.setData({ pop: false }) }, 900)
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      cloud.pushPendingScores()
    }
  },

  onBack: function () {
    wx.navigateBack()
  },

  /** 保存并前往下一个理论 */
  onNext: function () {
    this.award()
    const q = this.data.isHistory ? ('?date=' + this.data.dateKey) : ''
    wx.redirectTo({ url: '/pages/anti/index' + q })
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

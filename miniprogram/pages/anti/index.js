const config = require('../../config')
const daily = require('../../utils/daily')
const points = require('../../utils/points')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const constants = require('../../utils/constants')

Page({
  data: {
    dateKey: '',
    isHistory: false,
    dateLabel: '',
    count: 0,
    pass: false,
    need: config.ANTI_PASS_COUNT,
    meals: [],
    savedAt: '',
    pop: false
  },

  onLoad: function (q) {
    const today = dateUtil.dayKey()
    const dateKey = (q && q.date) || today
    this.setData({
      dateKey: dateKey,
      isHistory: dateKey !== today,
      dateLabel: dateUtil.fmtDayLabel(dateKey)
    })
    this.load()
  },

  load: function () {
    const day = daily.getDay(this.data.dateKey)
    const meals = constants.MEALS.map(function (m) {
      const picked = day.anti[m.key] || []
      return {
        key: m.key,
        label: m.label,
        pickedCount: picked.length,
        cells: constants.ANTI_CATS.map(function (c) {
          return {
            key: c.key,
            label: c.label,
            icon: c.icon,
            on: picked.indexOf(c.key) >= 0
          }
        })
      }
    })
    const count = daily.antiCount(this.data.dateKey)
    this.setData({
      meals: meals,
      count: count,
      pass: count >= config.ANTI_PASS_COUNT,
      savedAt: dateUtil.nowHM()
    })
  },

  /** 保存并前往下一个理论 */
  onNext: function () {
    this.award()
    const q = this.data.isHistory ? ('?date=' + this.data.dateKey) : ''
    wx.redirectTo({ url: '/pages/sleep/index' + q })
  },

  onToggle: function (e) {
    const meal = e.currentTarget.dataset.meal
    const cat = e.currentTarget.dataset.cat
    daily.antiToggle(this.data.dateKey, meal, cat)
    this.load()
    this.award()
  },

  award: function () {
    if (this.data.isHistory) return
    const got = points.awardAllIfDone(this.data.dateKey, dateUtil.dayKey())
    if (got.indexOf('anti') >= 0) {
      this.setData({ pop: true })
      const self = this
      setTimeout(function () { self.setData({ pop: false }) }, 900)
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      cloud.pushPendingScores()
    }
  }
})

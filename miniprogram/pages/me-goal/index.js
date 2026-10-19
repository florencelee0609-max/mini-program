const profile = require('../../utils/profile')
const goals = require('../../utils/goals')
const config = require('../../config')

Page({
  data: {
    calories: '',
    strength: '',
    cardio: '',
    sleepText: '',
    calcText: '',
    overridden: [],
    waterGoal: config.WATER_MIN_L,
    advanced: ''
  },

  onLoad: function () {
    this.load()
  },

  load: function () {
    const p = profile.getProfile()
    if (!p) return
    const t = p.targets || {}
    const calc = goals.calcTargets(p)
    this.setData({
      calories: String(t.calories || ''),
      strength: String(t.strengthPerWeek || ''),
      cardio: String(t.cardioPerWeek || ''),
      sleepText: t.sleepText || '7–9 小时',
      waterGoal: String(goals.waterGoal()),
      advanced: '',
      overridden: p.overridden || [],
      calcText: '系统算出：' + calc.calories + ' 千卡 · 每周 ' + calc.strengthPerWeek + ' 力量 + ' + calc.cardioPerWeek + ' 有氧'
    })
  },

  onInput: function (e) {
    const k = e.currentTarget.dataset.k
    const patch = {}
    patch[k] = e.detail.value
    this.setData(patch)
  },

  onSave: function () {
    const c = Number(this.data.calories)
    const s = Number(this.data.strength)
    const d = Number(this.data.cardio)
    if (!c || c < 800 || c > 6000) {
      wx.showToast({ title: '热量填 800–6000', icon: 'none' })
      return
    }
    if (!s || s < 0 || s > 7) {
      wx.showToast({ title: '力量次数填 0–7', icon: 'none' })
      return
    }
    if (isNaN(d) || d < 0 || d > 7) {
      wx.showToast({ title: '有氧次数填 0–7', icon: 'none' })
      return
    }
    profile.overrideTarget('calories', Math.round(c))
    profile.overrideTarget('strengthPerWeek', Math.round(s))
    profile.overrideTarget('cardioPerWeek', Math.round(d))
    if ((this.data.sleepText || '').trim()) {
      profile.overrideTarget('sleepText', this.data.sleepText.trim())
    }
    wx.showToast({ title: '已保存', icon: 'none' })
    const self = this
    setTimeout(function () { wx.navigateBack() }, 500)
  },

  onReset: function () {
    const self = this
    wx.showModal({
      title: '恢复系统算出的目标？',
      content: '你手动改过的值会被覆盖。',
      success: function (r) {
        if (!r.confirm) return
        profile.resetTargets()
        self.load()
        wx.showToast({ title: '已恢复', icon: 'none' })
      }
    })
  }
})

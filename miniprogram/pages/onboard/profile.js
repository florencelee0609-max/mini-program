const app = getApp()
const profile = require('../../utils/profile')
const goals = require('../../utils/goals')

const ACT_LIST = [
  { key: 'sedentary', label: '久坐', sub: '基本不动，办公室为主' },
  { key: 'light', label: '轻度', sub: '每周动 1–2 次' },
  { key: 'moderate', label: '中度', sub: '每周动 3–4 次' },
  { key: 'high', label: '高强度', sub: '每周动 5 次以上' }
]

Page({
  data: {
    mode: 'create',
    sex: '',
    age: '',
    heightCm: '',
    weightKg: '',
    activity: '',
    acts: ACT_LIST,
    err: {},
    canNext: false
  },

  onLoad: function (q) {
    if (q && q.mode === 'edit') {
      const p = profile.getProfile()
      if (p) {
        this.setData({
          mode: 'edit',
          sex: p.sex, age: String(p.age || ''), heightCm: String(p.heightCm || ''),
          weightKg: String(p.weightKg || ''), activity: p.activity
        })
        this.check()
      }
    }
    wx.setNavigationBarTitle && wx.setNavigationBarTitle({ title: '身体档案' })
  },

  onSex: function (e) {
    this.setData({ sex: e.currentTarget.dataset.k })
    this.check()
  },

  onAct: function (e) {
    this.setData({ activity: e.currentTarget.dataset.k })
    this.check()
  },

  onInput: function (e) {
    const k = e.currentTarget.dataset.k
    const patch = {}
    patch[k] = e.detail.value
    this.setData(patch)
    this.check()
  },

  check: function () {
    const d = this.data
    const err = {}
    ;['age', 'heightCm', 'weightKg'].forEach(function (k) {
      const msg = profile.checkField(k, d[k])
      if (msg) err[k] = msg
    })
    if (!d.sex) err.sex = '请选择性别'
    if (!d.activity) err.activity = '请选择日常活动量'
    const canNext = Object.keys(err).length === 0
    this.setData({ err: err, canNext: canNext })
    return canNext
  },

  onNext: function () {
    if (!this.check()) return
    const draft = {
      sex: this.data.sex,
      age: Number(this.data.age),
      heightCm: Number(this.data.heightCm),
      weightKg: Number(this.data.weightKg),
      activity: this.data.activity
    }
    if (this.data.mode === 'edit') {
      profile.updateBody(draft)
      wx.showToast({ title: '已保存', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 500)
      return
    }
    app.globalData.draft = Object.assign(app.globalData.draft || {}, draft)
    wx.navigateTo({ url: '/pages/onboard/shape' })
  }
})

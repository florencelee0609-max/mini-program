const app = getApp()

const SHAPES = [
  { key: 'leaner', label: '偏瘦一点', sub: '先把体脂降下来，体重可以掉一点', tag: '热量 −300' },
  { key: 'keep', label: '保持匀称', sub: '体重不动，状态维持住', tag: '热量 ±0' },
  { key: 'thinMuscle', label: '薄肌有线条', sub: '体重基本不动，靠力量训练改体型', tag: '热量 ±0' },
  { key: 'muscular', label: '明显肌肉', sub: '体重往上走，训练量加大', tag: '热量 +300' }
]

Page({
  data: {
    shapes: SHAPES,
    bodyGoal: ''
  },

  onLoad: function () {
    const d = app.globalData.draft || {}
    this.setData({ bodyGoal: d.bodyGoal || '' })
  },

  onPick: function (e) {
    this.setData({ bodyGoal: e.currentTarget.dataset.k })
  },

  onNext: function () {
    if (!this.data.bodyGoal) {
      wx.showToast({ title: '先选一个', icon: 'none' })
      return
    }
    app.globalData.draft = Object.assign(app.globalData.draft || {}, { bodyGoal: this.data.bodyGoal })
    wx.navigateTo({ url: '/pages/onboard/result' })
  }
})

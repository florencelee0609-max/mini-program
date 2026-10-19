Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    back: { type: Boolean, value: true },
    sub: { type: String, value: '' }
  },
  data: { statusBar: 20 },
  attached: function () {
    let h = 20
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      h = info.statusBarHeight || 20
    } catch (e) { /* 兜底 20 */ }
    this.setData({ statusBar: h })
  },
  methods: {
    onBack: function () {
      const pages = getCurrentPages()
      if (pages.length > 1) wx.navigateBack()
      else wx.switchTab({ url: '/pages/home/index' })
    }
  }
})

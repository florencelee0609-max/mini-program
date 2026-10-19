const config = require('../../config')
const profile = require('../../utils/profile')

Page({
  data: {
    slogan: '',
    typed: '',
    cells: [0, 0, 0, 0, 0],
    showFrame: true
  },

  onLoad: function () {
    this.setData({ slogan: config.slogan })
    this.startTyping()
    this.startProgress()
    // 最长 1.2 秒后必须进下一屏
    this.leaveTimer = setTimeout(this.leave.bind(this), 1200)
  },

  onUnload: function () {
    clearInterval(this.typeTimer)
    clearInterval(this.progTimer)
    clearTimeout(this.leaveTimer)
  },

  startTyping: function () {
    const text = config.slogan
    let i = 0
    const self = this
    this.typeTimer = setInterval(function () {
      i++
      self.setData({ typed: text.slice(0, i) })
      if (i >= text.length) clearInterval(self.typeTimer)
    }, 30)
  },

  startProgress: function () {
    let n = 0
    const self = this
    this.progTimer = setInterval(function () {
      n++
      const cells = [0, 0, 0, 0, 0]
      for (let i = 0; i < Math.min(n, 5); i++) cells[i] = 1
      self.setData({ cells: cells })
      if (n >= 3) clearInterval(self.progTimer)
    }, 240)
  },

  onSkip: function () {
    this.leave()
  },

  leave: function () {
    if (this.left) return
    this.left = true
    clearInterval(this.typeTimer)
    clearInterval(this.progTimer)
    if (profile.hasProfile()) {
      wx.switchTab({ url: '/pages/home/index' })
    } else {
      wx.redirectTo({ url: '/pages/onboard/profile' })
    }
  }
})

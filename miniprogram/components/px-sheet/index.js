Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    // 键盘高度（px），由页面在 input 的 focus 事件里传入。
    // 用 input 的 e.detail.height 而不是 wx.onKeyboardHeightChange：
    // 前者从基础库 1.0 就有，是官方文档明确的字段；后者在真机上返回的
    // 值不可控（曾把弹层直接顶出屏幕，表现为「弹层消失」）。
    kb: { type: Number, value: 0 }
  },

  data: {
    // 实际用于定位的高度，已夹紧到安全范围
    innerKb: 0
  },

  observers: {
    kb: function (v) {
      const n = Number(v)
      const raw = isNaN(n) || n < 0 ? 0 : n
      // 硬上限：键盘再高也不超过窗口高度的 60%。
      // 这一层是防止任何异常值把 bottom 顶到屏幕外 —— 宁可位置略低，也不能消失。
      const cap = this._maxKb || 400
      const capped = Math.min(raw, cap)
      if (capped !== this.data.innerKb) this.setData({ innerKb: capped })
    }
  },

  lifetimes: {
    attached: function () {
      let wh = 667
      try {
        const info = (wx.getWindowInfo && wx.getWindowInfo()) ||
                     (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {}
        wh = info.windowHeight || wh
      } catch (e) {}
      this._maxKb = Math.round(wh * 0.6)
    }
  },

  methods: {
    onClose: function () {
      this.triggerEvent('close')
    },
    noop: function () {}
  }
})

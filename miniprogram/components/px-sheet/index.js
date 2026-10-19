Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' }
  },

  data: {
    // 键盘高度（px），0 表示收起。
    // 弹层是 position:fixed; bottom:0，键盘弹起时 fixed 元素不会自动上移，
    // 会把底部的「保存」按钮盖住，所以这里主动把弹层抬高。
    kb: 0
  },

  lifetimes: {
    attached: function () {
      // 全局键盘高度监听。不用给 slot 里的 input 逐个绑 focus：
      // slot 内容属于父页面作用域，组件内拿不到它们的事件。
      if (typeof wx !== 'undefined' && wx.onKeyboardHeightChange) {
        this._kbHandler = (res) => {
          const h = (res && res.height) || 0
          // 只更新「正在显示」的弹层：tab 页不会销毁，未打开的实例没必要跟着重渲染。
          // 收起（h=0）时一律归零，避免残留高度把下次打开顶偏。
          if (h === this.data.kb) return
          if (h !== 0 && !this.data.show) return
          this.setData({ kb: h })
        }
        wx.onKeyboardHeightChange(this._kbHandler)
      }
    },

    detached: function () {
      if (this._kbHandler && typeof wx !== 'undefined' && wx.offKeyboardHeightChange) {
        wx.offKeyboardHeightChange(this._kbHandler)
      }
      this._kbHandler = null
    }
  },

  methods: {
    onClose: function () {
      this.triggerEvent('close')
    },
    noop: function () {}
  }
})

Component({
  data: {
    selected: 0,
    list: [
      { path: '/pages/home/index', text: '今日', icon: 'home' },
      { path: '/pages/trend/index', text: '趋势', icon: 'chart' },
      { path: '/pages/rank/index', text: '榜单', icon: 'trophy' },
      { path: '/pages/me/index', text: '我的', icon: 'user' }
    ]
  },
  methods: {
    onTap: function (e) {
      const i = Number(e.currentTarget.dataset.index)
      const item = this.data.list[i]
      if (i === this.data.selected) return
      this.setData({ selected: i })
      wx.switchTab({ url: item.path })
    }
  }
})

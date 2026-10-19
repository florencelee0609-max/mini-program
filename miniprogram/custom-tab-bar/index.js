// 与 app.json 的 tabBar.list 顺序保持一致（route 不带前导斜杠）
const ROUTES = [
  'pages/home/index',
  'pages/trend/index',
  'pages/rank/index',
  'pages/me/index'
]

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

  lifetimes: {
    attached: function () {
      this.syncSelected()
    }
  },

  pageLifetimes: {
    show: function () {
      this.syncSelected()
    }
  },

  methods: {
    // 按当前页面路由反推选中项。
    // 开启 lazyCodeLoading 后，页面 onShow 里的 getTabBar() 有可能在首次
    // 渲染时返回 null，此时页面推过来的 selected 收不到，高亮会停在上一页
    // 的位置。这里由组件自己兜底，保证从任何入口进来高亮都正确。
    syncSelected: function () {
      try {
        const pages = getCurrentPages()
        const cur = pages[pages.length - 1]
        const route = cur && cur.route
        const i = ROUTES.indexOf(route)
        if (i >= 0 && i !== this.data.selected) this.setData({ selected: i })
      } catch (e) {
        // 页面栈尚未就绪时保持当前值即可
      }
    },

    onTap: function (e) {
      const i = Number(e.currentTarget.dataset.index)
      const item = this.data.list[i]
      if (i === this.data.selected) return
      this.setData({ selected: i })
      wx.switchTab({ url: item.path })
    }
  }
})

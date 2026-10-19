const config = require('./config')

App({
  globalData: {
    coldStart: true,        // 用于开屏只播一次
    inviteCode: '',         // 从分享卡进入时带的一次性邀请码
    serverToday: '',        // 服务器当天（YYYY-MM-DD），拿不到时回退本地
    cloudReady: false
  },

  onLaunch(options) {
    // 云开发：只有配了环境 ID 才初始化，否则全应用走本地降级
    if (config.cloudEnvId && wx.cloud) {
      try {
        wx.cloud.init({ env: config.cloudEnvId, traceUser: true })
        this.globalData.cloudReady = true
      } catch (e) {
        console.warn('[cloud] init failed', e)
      }
    }
    // 分享卡进入
    const q = (options && options.query) || {}
    if (q.inviteCode) this.globalData.inviteCode = q.inviteCode
    this.globalData.coldStart = true
  },

  onShow(options) {
    const q = (options && options.query) || {}
    if (q.inviteCode) this.globalData.inviteCode = q.inviteCode
  }
})

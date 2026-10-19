const config = require('./config')

/**
 * 只在开发版弹出错误详情。线上不做任何打扰。
 * 作用：任何未捕获异常都会显式提示，不会再出现「点了没反应」这种无信息状态。
 */
function isDevelop() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync()
    if (!info || !info.miniProgram) return true
    return info.miniProgram.envVersion === 'develop'
  } catch (e) {
    return true
  }
}

function reportError(where, e) {
  console.error('[' + where + ']', e)
  if (!isDevelop()) return
  const text = String((e && e.message) || e || '未知错误')
  wx.showModal({
    title: '运行时出错',
    content: where + '：' + text.slice(0, 180),
    showCancel: false,
    confirmText: '知道了'
  })
}

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
  },

  onError(err) {
    reportError('onError', err)
  },

  onUnhandledRejection(res) {
    reportError('onUnhandledRejection', res && res.reason)
  }
})

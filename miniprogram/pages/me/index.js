const profile = require('../../utils/profile')
const storage = require('../../utils/storage')
const cloud = require('../../utils/cloud')
const dateUtil = require('../../utils/date')
const fmt = require('../../utils/format')
const config = require('../../config')

Page({
  data: {
    has: false,
    name: '',
    avatarKey: 'a01',
    dayN: 1,
    hideRank: false,
    goalText: '',
    storageText: '0 KB',
    lastBackupText: '从未备份',
    version: config.version,

    showNick: false,
    nick: '',
    pick: 'a01',
    avatars: profile.AVATARS
  },

  onShow: function () {
    const tb = this.getTabBar && this.getTabBar()
    if (tb) tb.setData({ selected: 3 })
    this.load()
  },

  load: function () {
    const p = profile.getProfile()
    const meta = storage.getMeta()
    const bytes = storage.estimateBytes()
    const t = (p && p.targets) || {}
    this.setData({
      has: profile.hasProfile(),
      name: profile.displayName(p),
      avatarKey: (p && p.avatarKey) || 'a01',
      dayN: dateUtil.dayIndex(meta.firstLaunchAt),
      hideRank: !!(p && p.hideRank),
      goalText: t.calories ? (t.calories + ' 千卡 · ' + (t.strengthPerWeek || 3) + ' 次力量') : '还没生成',
      storageText: bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B',
      lastBackupText: fmt.backupTime(meta.lastBackupAt)
    })
  },

  onProfile: function () {
    wx.navigateTo({ url: '/pages/onboard/profile?mode=edit' })
  },

  onGoal: function () {
    wx.navigateTo({ url: '/pages/me-goal/index' })
  },

  onData: function () {
    wx.navigateTo({ url: '/pages/me-data/index' })
  },

  onNick: function () {
    const p = profile.getProfile() || {}
    this.setData({
      showNick: true,
      nick: p.nickname || '',
      pick: p.avatarKey || 'a01'
    })
  },

  onCloseNick: function () {
    this.setData({ showNick: false })
  },

  onNickInput: function (e) {
    this.setData({ nick: e.detail.value })
  },

  onPickAvatar: function (e) {
    this.setData({ pick: e.currentTarget.dataset.k })
  },

  onSaveNick: function () {
    const p = profile.saveProfile({
      nickname: (this.data.nick || '').trim(),
      avatarKey: this.data.pick
    })
    cloud.pushProfile(p)
    this.setData({ showNick: false })
    this.load()
  },

  onHideRank: function (e) {
    const v = e.detail.value
    const p = profile.saveProfile({ hideRank: v })
    cloud.pushProfile(p)
    this.setData({ hideRank: v })
  },

  onRank: function () {
    wx.switchTab({ url: '/pages/rank/index' })
  },

  onAbout: function () {
    wx.showModal({
      title: '大理论时代 v' + config.version,
      content: '记录只存在这台手机上，删小程序就没了，请定期导出备份。榜单上的分数存在云端。公式估算，非医疗建议。',
      showCancel: false
    })
  }
})

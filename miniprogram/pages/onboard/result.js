const app = getApp()
const profile = require('../../utils/profile')
const goals = require('../../utils/goals')
const storage = require('../../utils/storage')
const cloud = require('../../utils/cloud')

Page({
  data: {
    targets: null,
    nickname: '',
    avatarKey: 'a01',
    avatars: profile.AVATARS,
    saving: false
  },

  onLoad: function () {
    const d = app.globalData.draft || {}
    const t = goals.calcTargets(d)
    this.setData({
      targets: t,
      nickname: '',
      avatarKey: 'a01'
    })
  },

  onNick: function (e) {
    this.setData({ nickname: e.detail.value })
  },

  onAvatar: function (e) {
    this.setData({ avatarKey: e.currentTarget.dataset.k })
  },

  onStart: function () {
    if (this.data.saving) return
    this.setData({ saving: true })

    const d = app.globalData.draft || {}
    if (!d.sex) { wx.redirectTo({ url: '/pages/onboard/profile' }); return }

    const p = profile.saveProfile(Object.assign({}, d, {
      nickname: (this.data.nickname || '').trim(),
      avatarKey: this.data.avatarKey
    }))

    const meta = storage.getMeta()
    if (!meta.firstLaunchAt) storage.patchMeta({ firstLaunchAt: Date.now() })

    cloud.pushProfile(p)

    const invite = app.globalData.inviteCode
    wx.switchTab({
      url: '/pages/home/index',
      success: function () {
        if (invite) {
          setTimeout(function () {
            wx.showModal({
              title: '有搭子邀请你',
              content: '接受后你们可以在榜单上看到彼此的积分。',
              confirmText: '接受',
              cancelText: '先不了',
              success: function (r) {
                if (r.confirm) {
                  cloud.acceptInvite(invite).then(function (res) {
                    wx.showToast({ title: (res && res.ok) ? '已接受' : '邀请已失效', icon: 'none' })
                  }).catch(function () {
                    wx.showToast({ title: '网络不可用，稍后再试', icon: 'none' })
                  })
                  app.globalData.inviteCode = ''
                }
              }
            })
          }, 600)
        }
      }
    })
  }
})

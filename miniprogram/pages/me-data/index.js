const backup = require('../../utils/backup')
const storage = require('../../utils/storage')
const points = require('../../utils/points')
const fmt = require('../../utils/format')

Page({
  data: {
    sizeText: '0 B',
    dayCount: 0,
    pointCount: 0,
    lastBackupText: '从未备份',
    pasteText: '',
    busy: false
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    const bytes = storage.estimateBytes()
    const dailyMap = storage.read(storage.KEYS.daily, {})
    const pts = storage.read(storage.KEYS.points, [])
    this.setData({
      sizeText: bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B',
      dayCount: Object.keys(dailyMap || {}).length,
      pointCount: pts.length,
      lastBackupText: fmt.backupTime(storage.getMeta().lastBackupAt)
    })
  },

  onExport: function () {
    if (this.data.busy) return
    this.setData({ busy: true })
    const self = this
    backup.exportBackup().then(function (r) {
      self.setData({ busy: false })
      if (!r.ok) {
        wx.showToast({ title: r.error || '导出失败', icon: 'none' })
        return
      }
      self.load()
      wx.showModal({
        title: r.mode === 'file' ? '备份文件已生成' : '备份已复制',
        content: r.mode === 'file'
          ? '已经调起转发，发到「文件传输助手」存起来。手机上删小程序也不会丢。'
          : '文件转发不可用，已把备份内容复制到剪贴板，粘贴到备忘录里存好。',
        showCancel: false
      })
    }).catch(function () {
      self.setData({ busy: false })
      wx.showToast({ title: '导出失败', icon: 'none' })
    })
  },

  onPaste: function (e) {
    this.setData({ pasteText: e.detail.value })
  },

  onPickFile: function () {
    const self = this
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: '请改用粘贴恢复', icon: 'none' })
      return
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: function (res) {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f) return
        try {
          const fs = wx.getFileSystemManager()
          const txt = fs.readFileSync(f.path, 'utf8')
          self.setData({ pasteText: txt })
          self.onRestore()
        } catch (err) {
          wx.showToast({ title: '读文件失败', icon: 'none' })
        }
      }
    })
  },

  onRestore: function () {
    const text = (this.data.pasteText || '').trim()
    if (!text) {
      wx.showToast({ title: '先选择文件或粘贴内容', icon: 'none' })
      return
    }
    let obj
    try {
      obj = JSON.parse(text)
    } catch (e) {
      wx.showToast({ title: '不是合法的 JSON', icon: 'none' })
      return
    }
    const v = backup.validate(obj)
    if (!v.ok) {
      wx.showModal({ title: '这份备份用不了', content: v.error, showCancel: false })
      return
    }
    const self = this
    wx.showModal({
      title: '确认恢复？',
      content: '会用备份里的数据完全替换当前数据：' + v.stats.days + ' 天记录、' + v.stats.points + ' 分。当前数据将被覆盖。',
      confirmText: '替换',
      success: function (r) {
        if (!r.confirm) return
        const res = backup.apply(obj)
        if (res.ok) {
          wx.showToast({ title: '恢复完成', icon: 'none' })
          self.setData({ pasteText: '' })
          self.load()
        } else {
          wx.showModal({ title: '恢复失败', content: res.error, showCancel: false })
        }
      }
    })
  },

  onClear: function () {
    wx.showModal({
      title: '清空所有数据？',
      content: '记录与积分都会删除，榜单名次归零。这一步没法撤销，建议先导出备份。',
      confirmText: '清空',
      confirmColor: '#D9542B',
      success: function (r) {
        if (!r.confirm) return
        backup.clearAll()
        wx.reLaunch({ url: '/pages/splash/index' })
      }
    })
  }
})
